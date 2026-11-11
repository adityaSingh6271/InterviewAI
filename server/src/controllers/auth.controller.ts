import type { Request, Response } from "express";
import { REFRESH_COOKIE_NAME } from "../constants/auth.constants";
import { ERROR_CODES } from "../constants/error-codes";
import { asyncHandler } from "../middleware/async-handler";
import { authService } from "../services/auth.service";
import { AppError } from "../utils/app-error.util";
import { clearRefreshCookie, setRefreshCookie } from "../utils/cookie.util";
import { resolveAccessControl } from "../utils/scope.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Auth controllers (PDF 12: thin - validate/call-service/serialise only, no
 * business logic, no SQL; async handlers wrapped so rejections reach the
 * central error handler).
 *
 * Cookie note (PDF 10): the refresh token is set/cleared here as an httpOnly
 * cookie and never appears in a response body; the body carries only the
 * short-lived access token plus the public user.
 */

/** Read the refresh token from the cookie or body if present and non-empty. */
function readRefreshToken(req: Request): string | undefined {
  const cookieVal: unknown = req.cookies?.[REFRESH_COOKIE_NAME];
  if (typeof cookieVal === "string" && cookieVal.length > 0) {
    return cookieVal;
  }
  const bodyVal: unknown = req.body?.refreshToken;
  if (typeof bodyVal === "string" && bodyVal.length > 0) {
    return bodyVal;
  }
  return undefined;
}

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { user, accessControl, accessToken, refreshToken } = await authService.register(req.body);
    setRefreshCookie(res, refreshToken);
    sendSuccess(res, 201, { user, accessControl, accessToken, refreshToken });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { user, accessControl, accessToken, refreshToken } = await authService.login(req.body);
    setRefreshCookie(res, refreshToken);
    sendSuccess(res, 200, { user, accessControl, accessToken, refreshToken });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = readRefreshToken(req);
    if (!refreshToken) {
      throw AppError.unauthorized(
        "Refresh token is missing",
        ERROR_CODES.TOKEN_INVALID,
      );
    }

    const { user, accessControl, accessToken, refreshToken: rotated } = await authService.refresh(
      refreshToken,
    );
    setRefreshCookie(res, rotated);
    sendSuccess(res, 200, { user, accessControl, accessToken, refreshToken: rotated });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(readRefreshToken(req));
    clearRefreshCookie(res);
    sendSuccess(res, 200, null);
  }),

  /** Who am I - exercises `protect`; 401 without a valid access token. */
  me: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user ?? null;
    const accessControl = user ? resolveAccessControl(user) : null;
    sendSuccess(res, 200, {
      user: user ? { ...user, accessControl } : null,
      accessControl,
    });
  }),

  /** Explicit RBAC endpoint returning role, rank, scope, and specific capability flags. */
  rbac: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }
    sendSuccess(res, 200, resolveAccessControl(req.user));
  }),
};

