import type { RequestHandler } from "express";
import { ERROR_CODES } from "../constants/error-codes";
import { adminRepository } from "../repositories/admin.repository";
import { studentRepository } from "../repositories/student.repository";
import type { AdminRole, Portal } from "../types/auth.types";
import { AppError } from "../utils/app-error.util";
import { isPortal, verifyAccessToken } from "../utils/auth.util";
import { asyncHandler } from "./async-handler";

/**
 * Authentication and authorization (PDF 10 + 11), two-portal edition.
 *
 * `protect`  - verifies the short-lived access token (Bearer header), then
 *              reloads the identity from the table its `portal` claim names
 *              (students | admins) so tenancy always comes from the session
 *              and the database, never from client-supplied data.
 * `authorize` - deny-by-default guard; a route declares the portals it
 *              accepts and everything else gets 403.
 */
export const protect: RequestHandler = asyncHandler(async (req, _res, next) => {
  const header = req.header("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw AppError.unauthorized(
      "A Bearer access token is required",
      ERROR_CODES.TOKEN_INVALID,
    );
  }

  const token = header.slice("Bearer ".length).trim();
  const payload = verifyAccessToken(token); // throws on bad/expired token

  if (typeof payload.sub !== "string" || !isPortal(payload.portal)) {
    throw AppError.unauthorized("Access token is invalid", ERROR_CODES.TOKEN_INVALID);
  }

  const repo =
    payload.portal === "admin" ? adminRepository : studentRepository;
  const user = await repo.findById(payload.sub);
  if (!user) {
    // Token is cryptographically valid but the account is gone.
    throw AppError.unauthorized("Account no longer exists", ERROR_CODES.TOKEN_INVALID);
  }

  req.user = user;
  next();
});

/**
 * Portal guard - deny by default, whitelist the portals this route accepts
 * (PDF 11: permissions enforced server-side, hidden UI is not security).
 *
 *   router.get("/admin", protect, authorize("admin"), handler)
 */
export function authorize(...portals: Portal[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(AppError.unauthorized("Authentication required"));
      return;
    }
    if (!portals.includes(req.user.portal)) {
      next(
        AppError.forbidden(
          `Your portal (${req.user.portal}) cannot perform this action`,
        ),
      );
      return;
    }
    next();
  };
}

/**
 * Role gate inside the admin portal (PDF 11: RBAC on top of the portal
 * check) - for resources limited to specific AdminRole values, e.g.
 * organizations and LLM configs (SUPER_ADMIN only):
 *
 *   router.use(protect, authorizeRoles("SUPER_ADMIN"))
 *
 * Implies the admin portal: a student session (or a missing `adminRole`)
 * gets 403. Deny by default - an empty role list rejects everyone.
 */
export function authorizeRoles(...roles: AdminRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(AppError.unauthorized("Authentication required"));
      return;
    }
    const role = req.user.adminRole;
    if (req.user.portal !== "admin" || !role || !roles.includes(role)) {
      next(AppError.forbidden("Your role cannot perform this action"));
      return;
    }
    next();
  };
}
