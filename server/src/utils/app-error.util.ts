import { ERROR_CODES, type ErrorCode } from "../constants/error-codes";
import type { ErrorDetail } from "./response.util";

/**
 * Operational error carrying the HTTP status, stable error code, and
 * field-level details the client should receive (PDF 14: Custom AppError
 * class with statusCode, code, message, details).
 *
 * Throw these from services/controllers; the central error middleware is the
 * only place that serialises them. Unknown errors are logged and answered
 * with a generic 500 - stack traces, SQL text, and parameter values never
 * reach the client.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details: ErrorDetail[];
  readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details: ErrorDetail[] = [],
    isOperational = true,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = "Bad request", details: ErrorDetail[] = [], code: ErrorCode = ERROR_CODES.BAD_REQUEST): AppError {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = "Authentication required", code: ErrorCode = ERROR_CODES.UNAUTHORIZED): AppError {
    return new AppError(401, code, message);
  }

  static forbidden(message = "You do not have access to this resource"): AppError {
    return new AppError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(404, ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(message = "Resource already exists"): AppError {
    return new AppError(409, ERROR_CODES.CONFLICT, message);
  }

  /** 423 Locked - used by the login lockout policy (PDF 10). */
  static locked(message = "Account temporarily locked due to failed login attempts"): AppError {
    return new AppError(423, ERROR_CODES.ACCOUNT_LOCKED, message);
  }

  static unprocessable(message = "Validation failed", details: ErrorDetail[] = []): AppError {
    return new AppError(422, ERROR_CODES.VALIDATION_ERROR, message, details);
  }

  static tooManyRequests(message = "Too many requests, please try again later"): AppError {
    return new AppError(429, ERROR_CODES.RATE_LIMITED, message);
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError(500, ERROR_CODES.INTERNAL_ERROR, message, [], false);
  }

  /**
   * 503 - a dependency the feature needs is missing or down. Used by the AI
   * layer for `AI_NOT_CONFIGURED` (no active LLM config) and generic 503s.
   */
  static serviceUnavailable(
    message = "Service temporarily unavailable",
    code: ErrorCode = ERROR_CODES.SERVICE_NOT_READY,
  ): AppError {
    return new AppError(503, code, message);
  }

  /** 502 - the upstream LLM provider failed or rejected the request. */
  static badGateway(
    message = "Upstream service error",
    code: ErrorCode = ERROR_CODES.AI_UPSTREAM_ERROR,
  ): AppError {
    return new AppError(502, code, message);
  }

  /** 504 - the upstream LLM provider did not answer in time. */
  static gatewayTimeout(
    message = "Upstream service timed out",
    code: ErrorCode = ERROR_CODES.AI_TIMEOUT,
  ): AppError {
    return new AppError(504, code, message);
  }
}

/** PostgreSQL SQLSTATE codes we can map to a meaningful HTTP status (PDF 14). */
const PG_ERROR_MAP: Record<string, { statusCode: number; code: ErrorCode; message: string }> = {
  "23505": { statusCode: 409, code: ERROR_CODES.CONFLICT, message: "Resource already exists" },
  "23503": { statusCode: 409, code: ERROR_CODES.CONFLICT, message: "Referenced resource does not exist" },
  "23502": { statusCode: 400, code: ERROR_CODES.BAD_REQUEST, message: "A required field is missing" },
  "22P02": { statusCode: 400, code: ERROR_CODES.BAD_REQUEST, message: "Invalid identifier format" },
};

type PgLikeError = { code?: unknown; constraint?: unknown };

/**
 * Map a caught error onto an AppError.
 *
 * - AppError passes through untouched.
 * - Known PostgreSQL SQLSTATEs become their documented status (PDF 14).
 *   40001 (serialization failure) and 40P01 (deadlock) are handled by the
 *   retry loop in `withTransaction` and never reach this function as a final
 *   outcome.
 * - JWT errors become 401, body-parser errors keep their own 4xx status.
 * - Everything else becomes a generic 500 that leaks nothing.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const candidate = error as (PgLikeError & { status?: unknown; statusCode?: unknown; name?: unknown; message?: unknown }) | null;

  // PostgreSQL SQLSTATE.
  if (typeof candidate?.code === "string") {
    const mapped = PG_ERROR_MAP[candidate.code];
    if (mapped) {
      return new AppError(mapped.statusCode, mapped.code, mapped.message);
    }
  }

  // jsonwebtoken.
  if (candidate?.name === "TokenExpiredError") {
    return AppError.unauthorized("Access token has expired", ERROR_CODES.TOKEN_EXPIRED);
  }
  if (candidate?.name === "JsonWebTokenError" || candidate?.name === "NotBeforeError") {
    return AppError.unauthorized("Access token is invalid", ERROR_CODES.TOKEN_INVALID);
  }

  // express.json / body-parser attach a numeric status to parse failures.
  // Keep that status (400 parse failure, 413 payload too large, ...) but never
  // forward the underlying parser message, stack, or SQL text.
  const rawStatus = candidate?.statusCode ?? candidate?.status;
  if (typeof rawStatus === "number" && rawStatus >= 400 && rawStatus < 500) {
    const message = rawStatus === 413 ? "Request payload is too large" : "Malformed request";
    return new AppError(rawStatus, ERROR_CODES.BAD_REQUEST, message);
  }

  return AppError.internal();
}
