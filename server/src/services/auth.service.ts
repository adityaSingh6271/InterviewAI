import { randomUUID } from "node:crypto";
import {
  ACCOUNT_LOCKOUT_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from "../constants/auth.constants";
import { ERROR_CODES } from "../constants/error-codes";
import { adminRepository } from "../repositories/admin.repository";
import { instituteRepository } from "../repositories/institute.repository";
import { studentRepository } from "../repositories/student.repository";
import type {
  AuthTokens,
  AuthUser,
  AuthUserWithSecrets,
  Portal,
} from "../types/auth.types";
import { AppError } from "../utils/app-error.util";
import { resolveAccessControl, type UserAccessControl } from "../utils/scope.util";
import {
  comparePassword,
  hashPassword,
  hashToken,
  isPortal,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/auth.util";

/**
 * Authentication service (PDF 13: services hold business logic, stay
 * framework-agnostic - no req/res, no cookies, no HTTP - and throw typed
 * AppErrors instead of writing responses).
 *
 * Two-portal model: `portal` decides which table every lookup goes to
 * (`students` or `admins`); both tables carry the same auth columns.
 *
 * Policy implemented here (PDF 10):
 * - bcrypt hashing with cost >= 10 (env enforces BCRYPT_ROUNDS >= 10);
 * - no user enumeration: identical "invalid email or password" for unknown
 *   email and wrong password, with a dummy hash compare to equalise timing;
 * - lockout: MAX failed attempts -> locked for LOCKOUT minutes (423);
 * - refresh tokens are stored as SHA-256 digests and rotated on every use;
 * - logout revokes the stored digest (single-session-per-token rotation);
 * - register is student-only: the invite code resolves the institute, and
 *   admin accounts are seeded, never created through the API.
 */

/** Shared response for register/login/refresh. */
export type AuthResult = {
  user: AuthUser;
  accessControl: UserAccessControl;
} & AuthTokens;

/** Per-portal credential stores - both expose the same auth operations. */
const repos = {
  student: studentRepository,
  admin: adminRepository,
} as const;

function repoFor(portal: Portal): typeof studentRepository | typeof adminRepository {
  return repos[portal];
}

/** Cheap equaliser so unknown emails cost a bcrypt compare too. */
let dummyHash: Promise<string> | null = null;
function equaliseTiming(password: string): Promise<boolean> {
  dummyHash ??= hashPassword(randomUUID());
  return dummyHash.then((hash) => comparePassword(password, hash));
}

/** Generic failure - same message/status whether the email exists or not. */
function invalidCredentials(): AppError {
  return AppError.unauthorized(
    "Invalid email or password",
    ERROR_CODES.INVALID_CREDENTIALS,
  );
}

/** Strip secret fields before an identity crosses into the API layer. */
function toPublic(user: AuthUserWithSecrets): AuthUser {
  const { passwordHash, refreshTokenHash, failedAttempts, lockedUntil, ...publicUser } = user;
  const accessControl = resolveAccessControl(publicUser);
  return {
    ...publicUser,
    accessControl,
  };
}

export const authService = {
  /**
   * Create a student account and open its first session.
   *
   * The invite code (`instituteCode`) resolves the institute the student
   * belongs to; an unknown code is a field-level 422. The id and refresh
   * token are generated up front so a single atomic INSERT stores identity +
   * token hash together - no half-created sessions, and no transaction needed
   * for a single statement (PDF 5 applies to multi-statement work).
   *
   * @throws 422 when the invite code is unknown
   * @throws 409 when the email is already registered (documented enumeration
   *         exception: a duplicate sign-up is unavoidable feedback)
   */
  async register(input: {
    name: string;
    email: string;
    password: string;
    instituteCode: string;
  }): Promise<AuthResult> {
    const institute = await instituteRepository.findByJoinCode(input.instituteCode);
    if (!institute) {
      throw AppError.unprocessable("Registration failed", [
        {
          field: "instituteCode",
          message: "instituteCode does not match an invite code",
        },
      ]);
    }

    const passwordHash = await hashPassword(input.password);
    const id = randomUUID();
    const refreshToken = signRefreshToken({ id, portal: "student" });

    let user: AuthUser;
    try {
      user = await studentRepository.create({
        id,
        instituteId: institute.id,
        name: input.name,
        email: input.email,
        passwordHash,
        refreshTokenHash: hashToken(refreshToken),
      });
    } catch (error) {
      if ((error as { code?: unknown }).code === "23505") {
        throw AppError.conflict("Email already registered");
      }
      throw error;
    }

    const publicUser: AuthUser = {
      ...user,
      accessControl: resolveAccessControl(user),
    };
    return {
      user: publicUser,
      accessControl: publicUser.accessControl!,
      accessToken: signAccessToken(user),
      refreshToken,
    };
  },

  /** Verify credentials against the portal's table and open a session. */
  async login(input: {
    portal: Portal;
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const repo = repoFor(input.portal);
    const user = await repo.findByEmail(input.email);

    if (!user) {
      // Unknown email: still pay for a bcrypt compare so response time does
      // not reveal whether the account exists (PDF 10: no user enumeration).
      await equaliseTiming(input.password);
      throw invalidCredentials();
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw AppError.locked(
        "Account locked after repeated failed attempts. Please try again later.",
      );
    }

    const passwordOk = await comparePassword(input.password, user.passwordHash);
    if (!passwordOk) {
      const failedAttempts = user.failedAttempts + 1;
      const lockedUntil =
        failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS
          ? new Date(Date.now() + ACCOUNT_LOCKOUT_MS)
          : null;
      await repo.recordFailedLogin(user.id, failedAttempts, lockedUntil);
      throw invalidCredentials();
    }

    // Successful login: clear lock state, rotate in a fresh refresh token.
    const refreshToken = signRefreshToken({ id: user.id, portal: user.portal });
    await repo.resetLoginFailures(user.id);
    await repo.setRefreshToken(user.id, hashToken(refreshToken));

    const publicUser = toPublic(user);
    return {
      user: publicUser,
      accessControl: publicUser.accessControl!,
      accessToken: signAccessToken(user),
      refreshToken,
    };
  },

  /**
   * Exchange a refresh token for a new token pair (rotation).
   *
   * The `portal` claim inside the token names the table to look in; the
   * presented token must match the stored digest, which makes replay of a
   * previously rotated token fail with 401 - exactly the behaviour PDF 10
   * requires (rotation + revocation, stored hashed).
   *
   * @throws 401 for missing/garbage/expired/already-rotated tokens
   */
  async refresh(refreshToken: string): Promise<AuthResult> {
    const payload = verifyRefreshToken(refreshToken); // throws -> 401

    if (
      payload.typ !== "refresh" ||
      typeof payload.sub !== "string" ||
      !isPortal(payload.portal)
    ) {
      throw AppError.unauthorized("Refresh token is invalid", ERROR_CODES.TOKEN_INVALID);
    }

    const repo = repoFor(payload.portal);
    const user = await repo.findByRefreshTokenHash(hashToken(refreshToken));
    if (!user || user.id !== payload.sub) {
      // Unknown, revoked, or already rotated (possible replay).
      throw AppError.unauthorized(
        "Refresh token is invalid or expired",
        ERROR_CODES.TOKEN_INVALID,
      );
    }

    const nextRefreshToken = signRefreshToken({ id: user.id, portal: user.portal });
    await repo.setRefreshToken(user.id, hashToken(nextRefreshToken));

    const publicUser = toPublic(user);
    return {
      user: publicUser,
      accessControl: publicUser.accessControl!,
      accessToken: signAccessToken(user),
      refreshToken: nextRefreshToken,
    };
  },

  /**
   * Revoke the refresh token backing this session. Idempotent: an absent,
   * malformed, or unknown token is not an error (PDF: logout must always
   * succeed from the user's point of view).
   */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = verifyRefreshToken(refreshToken);
      if (payload.typ !== "refresh" || !isPortal(payload.portal)) return;
      const repo = repoFor(payload.portal);
      const user = await repo.findByRefreshTokenHash(hashToken(refreshToken));
      if (user && typeof payload.sub === "string" && user.id === payload.sub) {
        await repo.setRefreshToken(user.id, null);
      }
    } catch {
      // Malformed/expired token - logout stays a silent success.
    }
  },
};
