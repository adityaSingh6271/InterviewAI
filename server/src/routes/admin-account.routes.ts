import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { authorize, protect } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  adminAccountParams,
  createAdminSchema,
  listAdminsQuery,
  updateAdminSchema,
} from "../validations/admin.validation";

/**
 * Admin account CRUD (PDF 8 + 11). Separate from `/admin` (the dashboard
 * stats mount) so the resource path stays a plural noun.
 *
 * Mounted at /admins -> /api/v1/admins
 *
 * GET    /admins              -> 200 (paginated) | 401 | 403 (student)
 * POST   /admins              -> 201 | 403 (role above your own)
 * GET    /admins/:adminId     -> 200 | 404 (out of scope)
 * PATCH  /admins/:adminId     -> 200 | 403 | 404 | 409
 * DELETE /admins/:adminId     -> 204 | 400 (self) | 403 | 404
 *
 * The route guarantees an admin session; the service rank-checks every
 * role change and institute move (a client-supplied `role` can never
 * escalate privileges) and revokes sessions on password change.
 */
export const adminAccountRouter = Router();

adminAccountRouter.use(protect, authorize("admin"));

adminAccountRouter.get(
  "/",
  validate({ query: listAdminsQuery }),
  adminController.list,
);
adminAccountRouter.post(
  "/",
  validate({ body: createAdminSchema }),
  adminController.create,
);
adminAccountRouter.get(
  "/:adminId",
  validate({ params: adminAccountParams }),
  adminController.getById,
);
adminAccountRouter.patch(
  "/:adminId",
  validate({ params: adminAccountParams, body: updateAdminSchema }),
  adminController.update,
);
adminAccountRouter.delete(
  "/:adminId",
  validate({ params: adminAccountParams }),
  adminController.remove,
);
