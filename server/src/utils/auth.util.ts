import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { sign as jwtSign, verify as jwtVerify, type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";
import { ACCESS_TOKEN_TTL, BCRYPT_COST, REFRESH_TOKEN_TTL } from "../constants/auth.constants";
import type { AuthUser, Portal } from "../types/auth.types";

/**
 * Password hashing and JWT utilities (PDF 10: Authentication).
 *
 * - bcrypt with cost >= 10 (the env schema also enforces BCRYPT_ROUNDS >= 10).
 * - Short-lived access token (15m) signed with JWT_SECRET.
 * - Long-lived refresh token (7d) signed with JWT_REFRESH_SECRET; only its
 *   SHA-256 digest is stored in the database, so a database leak does not
 *   hand out usable refresh tokens.
 * - Secrets come from validated env config and are never hardcoded.
 */

/** Hash a plaintext password with bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.bcryptRounds ?? BCRYPT_COST);
}

/** Constant-time comparison of a plaintext password against its bcrypt hash. */
export async function comparePassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/**
 * Sign a short-lived access token.
 * Claims: `sub` (identity id) and `portal` (which table to load it from);
 * `exp` is set by the TTL. Privileges are never trusted from the token - the
 * auth middleware reloads the identity from the database.
 */
export function signAccessToken(user: Pick<AuthUser, "id" | "portal">): string {
  return jwtSign({ sub: user.id, portal: user.portal }, env.jwtSecret, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

/**
 * Sign a long-lived refresh token. Distinct secret from the access token so
 * the two can never be swapped for one another. A random `jti` makes every
 * mint unique even within the same second, so rotation always yields a
 * distinguishable replacement token.
 */
export function signRefreshToken(user: Pick<AuthUser, "id" | "portal">): string {
  return jwtSign(
    { sub: user.id, portal: user.portal, typ: "refresh", jti: randomUUID() },
    env.jwtRefreshSecret,
    { expiresIn: REFRESH_TOKEN_TTL },
  );
}

/** Type guard for the `portal` claim on JWT payloads. */
export function isPortal(value: unknown): value is Portal {
  return value === "student" || value === "admin";
}

/**
 * Verify an access token.
 * @returns the decoded payload
 * @throws jsonwebtoken errors (mapped to 401 by `toAppError`)
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwtVerify(token, env.jwtSecret) as JwtPayload;
}

/**
 * Verify a refresh token.
 * @returns the decoded payload
 * @throws jsonwebtoken errors (mapped to 401 by `toAppError`)
 */
export function verifyRefreshToken(token: string): JwtPayload {
  return jwtVerify(token, env.jwtRefreshSecret) as JwtPayload;
}

/**
 * SHA-256 digest of a refresh token, stored instead of the token itself.
 * Hex-encoded so it round-trips safely through a TEXT column.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
