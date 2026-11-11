import { Router } from "express";
import { applicationController } from "../controllers/application.controller";
import { authorize, protect } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  applicationParams,
  createApplicationSchema,
  listApplicationsQuery,
  updateApplicationSchema,
} from "../validations/application.validation";

/**
 * Student application routes (PDF 8 + 11).
 * Creation is student-only (`interviewId` in the body); status changes are
 * admin-only; read/delete accept both portals (own row or same institute).
 *
 * Mounted at /student-applications -> /api/v1/student-applications
 *
 * POST   /student-applications               -> 201 | 403 (admin) | 404 | 409
 * GET    /student-applications               -> 200 (admin, paginated)
 * GET    /student-applications/:applicationId-> 200 | 404
 * PATCH  /student-applications/:applicationId-> 200 | 403 | 404
 * DELETE /student-applications/:applicationId-> 204 | 404
 */
export const applicationRouter = Router();

applicationRouter.post(
  "/",
  protect,
  authorize("student"),
  validate({ body: createApplicationSchema }),
  applicationController.create,
);
applicationRouter.get(
  "/",
  protect,
  authorize("admin"),
  validate({ query: listApplicationsQuery }),
  applicationController.list,
);
applicationRouter.get(
  "/:applicationId",
  protect,
  validate({ params: applicationParams }),
  applicationController.getById,
);
applicationRouter.patch(
  "/:applicationId",
  protect,
  authorize("admin"),
  validate({ params: applicationParams, body: updateApplicationSchema }),
  applicationController.updateStatus,
);
applicationRouter.delete(
  "/:applicationId",
  protect,
  validate({ params: applicationParams }),
  applicationController.remove,
);
