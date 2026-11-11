import type { RequestHandler } from "express";
import { env } from "../config/env";
import { ERROR_CODES } from "../constants/error-codes";
import { AppError } from "../utils/app-error.util";

/**
 * Origin check - "which domain is this request coming from?" (PDF 16: CSRF
 * protection for cookie-bearing routes). The refresh token lives in an
 * httpOnly cookie, so credential endpoints must only accept requests from
 * our own frontend domains.
 *
 * - Requests whose `Origin` is present must match the CLIENT_ORIGIN
 *   allowlist (comma-separated, e.g. `http://localhost:3000,https://app.example.com`)
 *   or they are rejected with 403.
 * - Requests without an `Origin` header (curl, server-to-server) pass in
 *   development so local tooling keeps working; in production they are
 *   rejected with 403 ORIGIN_REQUIRED - both portals are browsers and always
 *   send Origin on POST.
 * - SameSite=Lax on the cookie is the primary defence; this is belt and braces.
 */
export const sameOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.header("origin");

  if (!origin) {
    if (env.isProduction) {
      next(new AppError(403, ERROR_CODES.ORIGIN_REQUIRED, "Origin header is required"));
      return;
    }
    next();
    return;
  }

  if (!env.clientOrigins.includes(origin)) {
    if (!env.isProduction) {
      if (origin.startsWith("http://localhost:") || origin.includes(".devtunnels.ms")) {
        next();
        return;
      }
    }
    next(AppError.forbidden("Cross-origin request blocked"));
    return;
  }

  next();
};

