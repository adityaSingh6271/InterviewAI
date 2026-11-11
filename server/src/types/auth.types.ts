/**
 * Two-portal auth model: every identity belongs to exactly one portal
 * (`student` or `admin`), which decides which table it lives in.
 */

import type { UserAccessControl } from "../utils/scope.util";

/** Which portal an identity belongs to - decides which table it lives in. */
export type Portal = "student" | "admin";

/** Admin privilege level inside the admin portal (maps to the AdminRole enum). */
export type AdminRole = "SUPER_ADMIN" | "ORG_ADMIN" | "INSTITUTE_ADMIN";

/**
 * The authenticated identity as returned by the API - snake_case database
 * columns are mapped to camelCase domain fields in the repository layer
 * (PDF 3). Never contains password or refresh-token material.
 */
export type AuthUser = {
  id: string;
  portal: Portal;
  name: string;
  email: string;
  instituteId: string;
  /** Present for the admin portal only (privilege level within it). */
  adminRole?: AdminRole;
  /** Explicit RBAC and capability metadata. */
  accessControl?: UserAccessControl;
  createdAt: string;
  updatedAt: string;
};

/** Internal row shape including secrets - never leaves the repository/service boundary. */
export type AuthUserWithSecrets = AuthUser & {
  passwordHash: string;
  /** SHA-256 of the current refresh token, or null when logged out. */
  refreshTokenHash: string | null;
  failedAttempts: number;
  lockedUntil: string | null;
};

/** What the register/login/refresh flows hand back to the controller. */
export type AuthTokens = {
  accessToken: string;
  /** Raw refresh token - set as an httpOnly cookie, never serialized to JSON. */
  refreshToken: string;
};
