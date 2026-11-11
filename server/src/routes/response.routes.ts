import { Router } from "express";
import { aiController } from "../controllers/ai.controller";
import { responseController } from "../controllers/response.controller";
import { authorize, protect } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { aiLimiter } from "../middleware/rate-limiter.middleware";
import { responseParams, updateResponseSchema } from "../validations/response.validation";

/**
 * Response routes (PDF 8 + 11). Submission and listing live on the parent
 * (`POST|GET /round-attempts/:attemptId/responses`); this router reads,
 * scores, and deletes a single response.
 *
 * Mounted at /responses -> /api/v1/responses
 *
 * GET    /responses/:responseId  -> 200 (owner or admin) | 404
 * PATCH  /responses/:responseId  -> 200 | 403 (evaluation fields) | 404 | 409
 * POST   /responses/:responseId/evaluate -> 200 (admin AI re-score) | 409 | 503
 * DELETE /responses/:responseId  -> 204 | 404 | 409
 *
 * Both portals reach PATCH/DELETE: the service lets an admin score freely,
 * while the owning student may only correct their transcript while the
 * attempt is still IN_PROGRESS (404 for strangers). The AI evaluate route
 * is admin-only and 409s while the attempt is still IN_PROGRESS.
 */
export const responseRouter = Router();

responseRouter.get(
  "/:responseId",
  protect,
  validate({ params: responseParams }),
  responseController.getById,
);
responseRouter.patch(
  "/:responseId",
  protect,
  validate({ params: responseParams, body: updateResponseSchema }),
  responseController.update,
);
responseRouter.post(
  "/:responseId/evaluate",
  protect,
  authorize("admin"),
  aiLimiter,
  validate({ params: responseParams }),
  aiController.evaluateResponse,
);
responseRouter.delete(
  "/:responseId",
  protect,
  validate({ params: responseParams }),
  responseController.remove,
);
