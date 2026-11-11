import type { ErrorRequestHandler } from "express";
import { logger } from "../config/logger";
import { toAppError } from "../utils/app-error.util";
import type { ErrorBody } from "../utils/response.util";

/**
 * Central error handler - the single place errors become JSON (PDF 14).
 * Must keep exactly four parameters, and must stay last in the middleware
 * chain (PDF 15).
 *
 * - AppError (and mapped PG/JWT/parser errors) render their own status + code;
 * - 4xx are logged at warn with request context but no stack;
 * - 5xx log message/stack/pgCode server-side and answer with a generic
 *   "Internal server error" - no stack traces, SQL text, or parameter values
 *   ever reach the client.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError = toAppError(error);
  const meta = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl.split("?")[0],
    status: appError.statusCode,
    code: appError.code,
  };

  if (appError.statusCode >= 500) {
    const original = error instanceof Error ? error : undefined;
    logger.error("Request failed", {
      ...meta,
      message: original?.message,
      stack: original?.stack,
      pgCode: (error as { code?: string } | null)?.code,
    });
  } else {
    logger.warn("Request rejected", { ...meta, message: appError.message });
  }

  const body: ErrorBody = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  };
  res.status(appError.statusCode).json(body);
};
