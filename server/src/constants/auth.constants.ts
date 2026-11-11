/**
 * Authentication policy constants (PDF 10: Authentication).
 * Kept in one place so service, controller, and tests agree.
 */

/** bcrypt cost factor. PDF 10 requires cost >= 10. */
export const BCRYPT_COST = 10;

/** Access token lifetime - short-lived, returned in the response body. */
export const ACCESS_TOKEN_TTL = "15m";

/** Refresh token lifetime - long-lived, delivered only as an httpOnly cookie. */
export const REFRESH_TOKEN_TTL = "7d";
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Cookie settings for the refresh token (PDF 16: secure cookies). */
export const REFRESH_COOKIE_NAME = "refresh_token";
/** Scoped to the auth routes so the cookie is not sent on every request. */
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

/** Consecutive failed logins before the account is locked. */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
/** How long the lock lasts, in milliseconds. */
export const ACCOUNT_LOCKOUT_MS = 15 * 60 * 1000;
