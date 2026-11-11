import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { logger } from "../config/logger";

/** Client-supplied ids are only trusted when they look like a correlation id. */
const SAFE_REQUEST_ID = /^[\w.-]{1,128}$/;

/**
 * Assigns every request a correlation id (PDF 15: request ID middleware),
 * echoes it as `x-request-id`, and logs method/path/status/duration once the
 * response finishes (PDF 17: request logging). Never logs query strings,
 * bodies, or headers - they can carry tokens and PII.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header("x-request-id");
  const id = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();

  req.requestId = id;
  res.setHeader("x-request-id", id);

  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const meta = {
      requestId: id,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
    };
    // Liveness probes would otherwise drown the log stream.
    if (meta.path?.startsWith("/api/v1/health")) {
      logger.debug("request", meta);
    } else {
      logger.info("request", meta);
    }
  });

  next();
};
