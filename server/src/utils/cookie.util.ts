import type { Response } from "express";
import { env } from "../config/env";
import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_TTL_MS,
} from "../constants/auth.constants";

/**
 * Refresh-token cookie helpers (PDF 10 + 16).
 *
 * The refresh token never appears in a JSON body - it is delivered only as:
 * - httpOnly: unreadable from JavaScript (XSS cannot steal it)
 * - sameSite "lax": not sent on cross-site POSTs (CSRF defence)
 * - secure: HTTPS-only in production
 * - path scoped to /api/v1/auth: attached only to the auth endpoints
 * - maxAge matching the 7-day token lifetime
 */
function isSecureContext(res: Response): boolean {
  if (env.isProduction) return true;
  const req = (res as any).req;
  if (!req) return false;
  const proto = req.headers?.["x-forwarded-proto"];
  const origin = req.headers?.origin || "";
  const host = req.headers?.host || "";
  return (
    proto === "https" ||
    req.secure ||
    origin.includes(".devtunnels.ms") ||
    host.includes(".devtunnels.ms")
  );
}

export function setRefreshCookie(res: Response, token: string): void {
  const secure = isSecureContext(res);
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

/** Mirror of `setRefreshCookie` with an empty value so the browser drops it. */
export function clearRefreshCookie(res: Response): void {
  const secure = isSecureContext(res);
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: REFRESH_COOKIE_PATH,
  });
}

