import app from "./app";
import { closePool, pingDatabase } from "./config/db";
import { env } from "./config/env";
import { logger } from "./config/logger";

/**
 * Server entrypoint (PDF 1: `server.ts` = config validation, listen,
 * graceful shutdown; PDF 28: SIGINT/SIGTERM drain the listener, then
 * `pool.end()`, with a hard 10s deadline).
 *
 * Import order matters: `config/env` validates the environment on import and
 * exits with a clear message if anything required is missing or invalid
 * (PDF 23: fail fast).
 */

/** A one-time connectivity check at boot (PDF 2). Never crashes the process:
 *  readiness reporting owns the outage story so dev can boot before PG is up. */
async function verifyDatabase(): Promise<void> {
  const ok = await pingDatabase();
  if (ok) {
    logger.info("PostgreSQL connection verified at startup");
  } else {
    logger.warn(
      "PostgreSQL unreachable at startup - /health/ready will report 503 until it recovers",
    );
  }
}

function registerShutdown(server: ReturnType<typeof app.listen>): void {
  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("Shutdown signal received", { signal });

    server.close(async (closeError) => {
      if (closeError) {
        logger.error("Error while draining the HTTP listener", { error: closeError });
      }
      try {
        await closePool(); // PDF 2: pool.end() on graceful shutdown
        logger.info("Shutdown complete");
        process.exit(closeError ? 1 : 0);
      } catch (poolError) {
        logger.error("Error while closing the database pool", { error: poolError });
        process.exit(1);
      }
    });

    // Anything still in flight gets a hard stop (PDF 28).
    setTimeout(() => {
      logger.error("Forced shutdown: still open after deadline");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  // Windows consoles deliver Ctrl+Break as SIGBREAK (never fires on POSIX).
  process.on("SIGBREAK", shutdown);
}

function registerProcessHandlers(): void {
  // PDF 14/17: async failures must be logged, never swallowed.
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", {
      reason:
        reason instanceof Error
          ? { message: reason.message, stack: reason.stack }
          : String(reason),
    });
  });

  process.on("uncaughtException", (error) => {
    // Process state is unreliable after this - log, then exit (PDF 14).
    logger.error("Uncaught exception", { error });
    process.exit(1);
  });
}

async function start(): Promise<void> {
  registerProcessHandlers();
  await verifyDatabase();

  const server = app.listen(env.port, () => {
    logger.info("Server listening", {
      environment: env.nodeEnv,
      port: env.port,
      url: `http://localhost:${env.port}/api/v1/health`,
    });
  });

  registerShutdown(server);
}

start().catch((error) => {
  logger.error("Failed to start server", { error });
  process.exit(1);
});
