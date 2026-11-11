import { Router } from "express";
import { aiController } from "../controllers/ai.controller";
import { attemptController } from "../controllers/attempt.controller";
import { authorize, protect } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { uploadAudioFile } from "../middleware/upload.middleware";
import { aiLimiter } from "../middleware/rate-limiter.middleware";
import { createResponseSchema, listResponsesQuery } from "../validations/response.validation";
import {
  attemptParams,
  listAttemptsQuery,
  startAttemptSchema,
  updateAttemptSchema,
} from "../validations/attempt.validation";

/**
 * Round attempt routes (PDF 8 + 11) - the student interview flow.
 *
 * Mounted at /round-attempts -> /api/v1/round-attempts
 *
 * POST   /round-attempts                       -> 201 (student starts, { roundId })
 * GET    /round-attempts                       -> 200 (admin: filtered; student: own only)
 * GET    /round-attempts/:attemptId            -> 200 (owner or admin) | 404
 * PATCH  /round-attempts/:attemptId            -> 200 (submit / evaluate) | 409
 * DELETE /round-attempts/:attemptId            -> 204 | 403 | 404
 * GET    /round-attempts/:attemptId/responses  -> 200 (owner or admin)
 * POST   /round-attempts/:attemptId/responses  -> 201 (student, IN_PROGRESS)
 * POST   /round-attempts/:attemptId/evaluate   -> 200 (admin AI re-score)
 *
 * Submission: the owning student moves IN_PROGRESS -> COMPLETED once
 * (a second PATCH is 409) - the first submit also runs inline AI
 * evaluation (meta: { evaluation, failed }); an admin moves it on to
 * EVALUATED.
 */
export const attemptRouter = Router();

attemptRouter.post(
  "/",
  protect,
  authorize("student"),
  validate({ body: startAttemptSchema }),
  attemptController.start,
);
attemptRouter.get(
  "/",
  protect,
  validate({ query: listAttemptsQuery }),
  attemptController.list,
);

// Nested responses - multi-segment paths cannot collide with /:attemptId.
attemptRouter.get(
  "/:attemptId/responses",
  protect,
  validate({ params: attemptParams, query: listResponsesQuery }),
  attemptController.listResponses,
);
attemptRouter.post(
  "/:attemptId/responses",
  protect,
  authorize("student"),
  validate({ params: attemptParams, body: createResponseSchema }),
  attemptController.createResponse,
);

attemptRouter.get(
  "/:attemptId",
  protect,
  validate({ params: attemptParams }),
  attemptController.getById,
);
attemptRouter.patch(
  "/:attemptId",
  protect,
  validate({ params: attemptParams, body: updateAttemptSchema }),
  attemptController.updateStatus,
);
attemptRouter.delete(
  "/:attemptId",
  protect,
  authorize("admin"),
  validate({ params: attemptParams }),
  attemptController.remove,
);

// AI transcription of a candidate's recorded audio turn (student, IN_PROGRESS).
attemptRouter.post(
  "/:attemptId/transcribe",
  protect,
  authorize("student"),
  aiLimiter,
  validate({ params: attemptParams }),
  uploadAudioFile,
  aiController.transcribeAttemptAudio,
);

// AI evaluation of a whole submitted attempt (admin, idempotent re-run).
attemptRouter.post(
  "/:attemptId/evaluate",
  protect,
  authorize("admin"),
  aiLimiter,
  validate({ params: attemptParams }),
  aiController.evaluateAttempt,
);
