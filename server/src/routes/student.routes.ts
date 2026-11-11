import { Router } from "express";
import { applicationController } from "../controllers/application.controller";
import { attemptController } from "../controllers/attempt.controller";
import { studentController } from "../controllers/student.controller";
import { authorize, protect } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { listApplicationsQuery, listByStudentParams } from "../validations/application.validation";
import { listAttemptsQuery } from "../validations/attempt.validation";
import {
  createStudentSchema,
  listStudentsQuery,
  studentParams,
  updateStudentSchema,
} from "../validations/student.validation";

/**
 * Student routes (PDF 8 + 11). List/create/delete are admin-only at the
 * route; get/update accept both portals so a student can manage their own
 * profile (the service answers 404 for anyone else's row).
 *
 * Mounted at /students -> /api/v1/students
 *
 * GET    /students                          -> 200 (paginated) | 401 | 403
 * POST   /students                          -> 201 | 403 (institute scope)
 * GET    /students/:studentId               -> 200 | 404
 * PATCH  /students/:studentId               -> 200 | 403 | 404 | 409
 * DELETE /students/:studentId               -> 204 | 403 | 404
 * GET    /students/:studentId/applications  -> 200 (self or admin)
 * GET    /students/:studentId/attempts      -> 200 (self or admin)
 */
export const studentRouter = Router();

studentRouter.get(
  "/",
  protect,
  authorize("admin"),
  validate({ query: listStudentsQuery }),
  studentController.list,
);
studentRouter.post(
  "/",
  protect,
  authorize("admin"),
  validate({ body: createStudentSchema }),
  studentController.create,
);
studentRouter.get(
  "/:studentId",
  protect,
  validate({ params: studentParams }),
  studentController.getById,
);
studentRouter.patch(
  "/:studentId",
  protect,
  validate({ params: studentParams, body: updateStudentSchema }),
  studentController.update,
);
studentRouter.delete(
  "/:studentId",
  protect,
  authorize("admin"),
  validate({ params: studentParams }),
  studentController.remove,
);

// ---- Nested sub-resources -------------------------------------------
studentRouter.get(
  "/:studentId/applications",
  protect,
  validate({ params: listByStudentParams, query: listApplicationsQuery }),
  applicationController.listByStudent,
);
studentRouter.get(
  "/:studentId/attempts",
  protect,
  validate({ params: studentParams, query: listAttemptsQuery }),
  attemptController.listByStudent,
);
