import type { Response } from "express";
import { rateLimit } from "express-rate-limit";
import { ERROR_CODES } from "../constants/error-codes";

/**
 * Rate limiting and throttling (PDF 26):
 * - a global per-IP limit in front of the whole API;
 * - a much stricter limit on auth endpoints (brute force / credential stuffing);
 * - 429 responses carry `Retry-After` and the standard error envelope.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const GLOBAL_LIMIT = 300; // requests per IP per window
const AUTH_LIMIT = 30; // stricter on register/login/refresh/logout

function reject(res: Response, windowMs: number, message: string): void {
  if (!res.headersSent) {
    res.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
    res.status(429).json({
      success: false,
      error: { code: ERROR_CODES.RATE_LIMITED, message, details: [] },
    });
  }
}

/** Applied to every `/api/v1` request. */
export const globalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: GLOBAL_LIMIT,
  standardHeaders: true, // draft-6 `RateLimit-*` headers
  legacyHeaders: false,
  handler: (_req, res) =>
    reject(res, WINDOW_MS, "Too many requests, please try again later"),
});

/** Stricter limit for the auth routes. */
export const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: AUTH_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    reject(res, WINDOW_MS, "Too many authentication attempts, please try again later"),
});

/**
 * Cost/latency guard for the LLM generation endpoints (AI layer): they are
 * per-request metered upstream, so they get a much tighter per-minute budget
 * than the global API limit.
 */
const AI_WINDOW_MS = 60 * 1000; // 1 minute
const AI_LIMIT = 15; // AI generations per IP per minute

export const aiLimiter = rateLimit({
  windowMs: AI_WINDOW_MS,
  limit: AI_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    reject(res, AI_WINDOW_MS, "Too many AI requests, please try again in a minute"),
});
