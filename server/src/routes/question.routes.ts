import { Router } from "express";
import { questionController } from "../controllers/question.controller";
import { authorize, protect } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { questionParams, updateQuestionSchema } from "../validations/question.validation";

/**
 * Question routes (PDF 8 + 11). Creation and listing live on the parent
 * (`POST|GET /rounds/:roundId/questions`); this router serves a single
 * question. Reads accept both portals (never DRAFT interviews); writes are
 * admin-only at the route.
 *
 * Mounted at /questions -> /api/v1/questions
 *
 * GET    /questions/:questionId  -> 200 | 404 (never DRAFT / out of scope)
 * PATCH  /questions/:questionId  -> 200 | 403 | 404
 * DELETE /questions/:questionId  -> 204 | 403 | 404
 */
export const questionRouter = Router();

questionRouter.get(
  "/:questionId",
  protect,
  validate({ params: questionParams }),
  questionController.getById,
);
questionRouter.patch(
  "/:questionId",
  protect,
  authorize("admin"),
  validate({ params: questionParams, body: updateQuestionSchema }),
  questionController.update,
);
questionRouter.delete(
  "/:questionId",
  protect,
  authorize("admin"),
  validate({ params: questionParams }),
  questionController.remove,
);
