import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "./env";
import { logger } from "./logger";

/**
 * PostgreSQL connection layer (PDF 2: Database Connection, PDF 5: Transactions).
 *
 * - A single exported Pool singleton; never `new Client()` per request.
 * - statement_timeout and application_name set for observability.
 * - A query wrapper that logs durations and slow queries (params are never
 *   written to the log - only the SQL fingerprint).
 * - withTransaction() for multi-step writes: BEGIN/COMMIT/ROLLBACK handled,
 *   the client is always released back to the pool in `finally`, and
 *   serialization/deadlock failures get a bounded retry.
 */
export const pool: Pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.dbPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: "ai-interviewer-api",
  statement_timeout: 10_000,
  // TLS is governed by `sslmode` in DATABASE_URL (verify-full semantics), not
  // by NODE_ENV: hosted databases (Neon) require it in dev too, while a local
  // PostgreSQL without TLS must keep working. Production URLs must therefore
  // include `sslmode=require` (documented in .env.example).
});

/** An idle-client error must never crash the process (PDF 2). */
pool.on("error", (error) => {
  logger.error("Unexpected error on idle PostgreSQL client", { error });
});

/** Strip whitespace and truncate - enough to identify a query, safe to log. */
function fingerprint(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 160 ? `${flat.slice(0, 160)}...` : flat;
}

/**
 * Execute a parameterized SQL query.
 * String interpolation into SQL is forbidden - always pass `$1, $2, ...` and `params`.
 *
 * @param text - SQL with `$n` placeholders
 * @param params - bound values, in placeholder order
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  const startedAt = Date.now();
  try {
    const result = await pool.query<T>(text, params as unknown[]);
    const durationMs = Date.now() - startedAt;
    if (durationMs >= env.slowQueryMs) {
      logger.warn("Slow query", { durationMs, sql: fingerprint(text) });
    } else {
      logger.debug("Query", { durationMs, sql: fingerprint(text) });
    }
    return result;
  } catch (error) {
    logger.error("Query failed", { durationMs: Date.now() - startedAt, sql: fingerprint(text), error });
    throw error;
  }
}

/** SQLSTATE codes worth retrying (PDF 5: deadlock handling with bounded retry). */
const RETRYABLE_CODES = new Set(["40001", "40P01"]);
const MAX_TRANSACTION_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run `work` inside a transaction with automatic COMMIT/ROLLBACK.
 *
 * The client is always released in `finally`. On a serialization failure
 * (40001) or deadlock (40P01) the whole transaction is retried a bounded
 * number of times. No external API calls should happen inside the callback.
 *
 * @param work - receives a dedicated client; use `client.query`, not the pool
 * @returns whatever `work` returns
 */
export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      lastError = error;
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        logger.error("ROLLBACK failed", { error: rollbackError });
      }

      const code = (error as { code?: unknown } | null)?.code;
      if (typeof code !== "string" || !RETRYABLE_CODES.has(code) || attempt === MAX_TRANSACTION_ATTEMPTS) {
        throw error;
      }

      logger.warn("Retrying transaction after retryable SQLSTATE", {
        code,
        attempt,
        maxAttempts: MAX_TRANSACTION_ATTEMPTS,
      });
      await sleep(RETRY_BASE_DELAY_MS * attempt);
    } finally {
      client.release();
    }
  }

  throw lastError;
}

/**
 * Verify connectivity at startup (PDF 2: connection health verified at boot).
 * Resolves `true` when the database answers, `false` otherwise - callers log
 * the result instead of crashing, so `/health/ready` can report the outage.
 */
export async function pingDatabase(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch (error) {
    logger.error("Database connectivity check failed at startup", { error });
    return false;
  }
}

/** Drain the pool during graceful shutdown (PDF 2: pool.end() on shutdown). */
export async function closePool(): Promise<void> {
  await pool.end();
}
