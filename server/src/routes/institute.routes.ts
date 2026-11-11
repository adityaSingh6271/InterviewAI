import { Router } from "express";
import { instituteController } from "../controllers/institute.controller";
import { authorize, protect } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  createInstituteSchema,
  instituteParams,
  listInstitutesQuery,
  updateInstituteSchema,
} from "../validations/institute.validation";

/**
 * Institute routes (PDF 8 + 11). The route only guarantees an admin
 * session - role scope (SUPER_ADMIN / ORG_ADMIN / INSTITUTE_ADMIN) and
 * tenancy are enforced in `instituteService` so a request can never pick
 * another organization via `organizationId`.
 *
 * Mounted at /institutes -> /api/v1/institutes
 *
 * GET    /institutes              -> 200 (paginated) | 401 | 403 (student)
 * POST   /institutes              -> 201 | 403 (INSTITUTE_ADMIN)
 * GET    /institutes/:instituteId -> 200 | 404 (out of scope)
 * PATCH  /institutes/:instituteId -> 200 | 403 | 404
 * DELETE /institutes/:instituteId -> 204 | 403 | 404
 */
export const instituteRouter = Router();

instituteRouter.use(protect, authorize("admin"));

instituteRouter.get(
  "/",
  validate({ query: listInstitutesQuery }),
  instituteController.list,
);
instituteRouter.post(
  "/",
  validate({ body: createInstituteSchema }),
  instituteController.create,
);
instituteRouter.get(
  "/:instituteId",
  validate({ params: instituteParams }),
  instituteController.getById,
);
instituteRouter.patch(
  "/:instituteId",
  validate({ params: instituteParams, body: updateInstituteSchema }),
  instituteController.update,
);
instituteRouter.delete(
  "/:instituteId",
  validate({ params: instituteParams }),
  instituteController.remove,
);
