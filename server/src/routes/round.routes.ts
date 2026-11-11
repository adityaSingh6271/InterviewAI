import { Router } from "express";
import { aiController } from "../controllers/ai.controller";
import { attemptController } from "../controllers/attempt.controller";
import { questionController } from "../controllers/question.controller";
import { roundController } from "../controllers/round.controller";
import { authorize, protect } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { aiLimiter } from "../middleware/rate-limiter.middleware";
import { createQuestionSchema, listQuestionsQuery } from "../validations/question.validation";
import { batchCreateQuestionsSchema } from "../validations/ai.validation";
import { listAttemptsQuery } from "../validations/attempt.validation";
import { roundParams, updateRoundSchema } from "../validations/round.validation";

/**
 * Round routes (PDF 8 + 11). Creation and listing live on the parent
 * (`POST|GET /interviews/:interviewId/rounds` - wired in `interview.routes.ts`
 * via `round.validation`'s schemas); this router serves the round itself
 * plus its nested question and attempt collections.
 *
 * Mounted at /rounds -> /api/v1/rounds
 *
 * GET    /rounds/:roundId/questions   -> 200 (paginated)
 * POST   /rounds/:roundId/questions   -> 201 | 403 (student)
 * POST   /rounds/:roundId/questions/batch -> 201 (AI preview commit) | 403
 * POST   /rounds/:roundId/questions/ensure -> 200 (generate-if-empty, student simulation) | 503
 * GET    /rounds/:roundId/attempts    -> 200 (admin pipeline)
 * GET    /rounds/:roundId             -> 200 | 404
 * PATCH  /rounds/:roundId             -> 200 | 403 | 404
 * DELETE /rounds/:roundId             -> 204 | 403 | 404
 */
export const roundRouter = Router();

// Nested questions - registered before /:roundId for readability only
// (single-segment and multi-segment paths cannot collide).
roundRouter.get(
  "/:roundId/questions",
  protect,
  validate({ params: roundParams, query: listQuestionsQuery }),
  questionController.listByRound,
);
roundRouter.post(
  "/:roundId/questions",
  protect,
  authorize("admin"),
  validate({ params: roundParams, body: createQuestionSchema }),
  questionController.create,
);
// Bulk commit - the persist half of the AI preview-then-confirm flow
// (multi-segment path, cannot collide with /:roundId/questions).
roundRouter.post(
  "/:roundId/questions/batch",
  protect,
  authorize("admin"),
  validate({ params: roundParams, body: batchCreateQuestionsSchema }),
  questionController.createBatch,
);
// Generate-on-demand for the student simulation flow: both portals, but
// students only reach published rounds of their own institute (service).
roundRouter.post(
  "/:roundId/questions/ensure",
  protect,
  aiLimiter,
  validate({ params: roundParams }),
  aiController.ensureRoundQuestions,
);

// Nested attempts (admin pipeline view of a round).
roundRouter.get(
  "/:roundId/attempts",
  protect,
  authorize("admin"),
  validate({ params: roundParams, query: listAttemptsQuery }),
  attemptController.listByRound,
);

// The round itself.
roundRouter.get(
  "/:roundId",
  protect,
  validate({ params: roundParams }),
  roundController.getById,
);
roundRouter.patch(
  "/:roundId",
  protect,
  authorize("admin"),
  validate({ params: roundParams, body: updateRoundSchema }),
  roundController.update,
);
roundRouter.delete(
  "/:roundId",
  protect,
  authorize("admin"),
  validate({ params: roundParams }),
  roundController.remove,
);
