import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";
import { sameOrigin } from "../middleware/origin.middleware";
import { authLimiter } from "../middleware/rate-limiter.middleware";
import { validate } from "../middleware/validation.middleware";
import { loginSchema, registerSchema } from "../validations/auth.validation";

/**
 * Auth routes (PDF 8 + 15): middleware order is
 * rate limit -> origin check -> validation -> controller, with `protect`
 * first for the one authenticated route.
 *
 * Two portals, one endpoint each - the `portal` body field selects the table:
 * POST   /api/v1/auth/register       student self-registration (portal must be
 *                                    "student", body carries name/email/
 *                                    password/instituteCode)  -> 201
 * POST   /api/v1/auth/login          open session (portal: "student"|"admin")
 *                                                                -> 200
 * POST   /api/v1/auth/refresh-token  rotate tokens (portal from refresh JWT)
 *                                                                -> 200
 * POST   /api/v1/auth/logout         revoke session             -> 200
 * GET    /api/v1/auth/me             current identity (portal from Bearer)
 *                                                                -> 200 | 401
 *
 * Register/login/refresh/logout are rate-limited and origin-checked because
 * they present or mint credentials; `me` is read-only behind `protect`.
 */
export const authRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  sameOrigin,
  validate({ body: registerSchema }),
  authController.register,
);

authRouter.post(
  "/login",
  authLimiter,
  sameOrigin,
  validate({ body: loginSchema }),
  authController.login,
);

authRouter.post("/refresh-token", authLimiter, sameOrigin, authController.refresh);

authRouter.post("/logout", authLimiter, sameOrigin, authController.logout);

authRouter.get("/me", protect, authController.me);

authRouter.get("/rbac", protect, authController.rbac);
