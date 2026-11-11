import type {} from "./types/express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { notFound } from "./middleware/not-found";
import { globalLimiter } from "./middleware/rate-limiter.middleware";
import { requestId } from "./middleware/request-id.middleware";
import { apiRouter } from "./routes";

/**
 * Express application assembly (PDF 1: `app.ts` wires the app, `server.ts`
 * owns listen + shutdown; also PDF 16: JSON-only parsing with a size limit,
 * explicit CORS origin, x-powered-by disabled).
 *
 * Middleware order (PDF 15):
 *   helmet -> cors -> body parsers -> compression -> cookies -> request id ->
 *   rate limit -> routes (auth -> validation -> controller) -> 404 -> error
 *
 * The error handler must stay last, and must keep four parameters.
 */
export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");

  // Only meaningful behind a reverse proxy (production / Vercel); trusting X-Forwarded-For
  // when there is no proxy would let clients spoof their own rate-limit key.
  if (env.isProduction || Boolean(process.env.VERCEL)) {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  // app.use(
  //   cors({
  //     origin: env.clientOrigins, // explicit allowlist, never `*` (PDF 16)
  //     credentials: true, // cookies (refresh token) must flow
  //   }),
  // );

  // ✅ USE THIS:
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allows ANY origin (Localhost, DevTunnels, etc.) while allowing credentials:
        callback(null, origin || true);
      },
      credentials: true,
    }),
  );

  // 1mb: the wizard's per-step payloads (up to a 50k-char resume text plus
  // description/requirements/artifacts) fit comfortably; the Joi caps in
  // validations are the real guard against oversized bodies (PDF 9).
  app.use(express.json({ limit: "1mb" })); // reject oversized payloads (PDF 9)
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(compression());
  app.use(cookieParser()); // must precede the auth routes that read the cookie
  app.use(requestId); // correlation id + request logging (PDF 15/17)
  app.get("/", (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        service: "ai-interviewer-api",
        status: "ok",
        health: "/api/v1/health",
      },
    });
  });

  app.use("/api/v1", globalLimiter); // per-IP throttle before any route (PDF 26)
  app.use("/api/v1", apiRouter);

  app.use(notFound); // unmatched -> 404 envelope
  app.use(errorHandler); // central error -> envelope (PDF 14)

  return app;
}
