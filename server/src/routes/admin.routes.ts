import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { authorize, protect } from "../middleware/auth.middleware";

/**
 * Admin routes (PDF 11: deny by default - `protect` verifies the session,
 * `authorize("admin")` whitelists the admin portal; a student token gets 403).
 *
 * GET /api/v1/admin/stats -> 200 (admin portal) | 401 (no/bad token)
 *                          | 403 (student portal)
 */
export const adminRouter = Router();

adminRouter.get("/stats", protect, authorize("admin"), adminController.getStats);
