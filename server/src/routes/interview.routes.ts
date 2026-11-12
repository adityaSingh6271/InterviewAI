import { Router } from "express";
import { aiController } from "../controllers/ai.controller";
import { applicationController } from "../controllers/application.controller";
import { interviewController } from "../controllers/interview.controller";
import { roundController } from "../controllers/round.controller";
import { authorize, protect } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { aiLimiter } from "../middleware/rate-limiter.middleware";
import { listApplicationsQuery } from "../validations/application.validation";
import {
  draftDescriptionSchema,
  generateQuestionsSchema,
} from "../validations/ai.validation";
import {
  createInterviewSchema,
  createNoteSchema,
  interviewParams,
  listInterviewsQuery,
  noteParams,
  updateInterviewSchema,
} from "../validations/interview.validation";
import { createRoundSchema, listRoundsQuery } from "../validations/round.validation";
import { listQuery } from "../validations/common.validation";

/**
 * Interview routes (PDF 8 + 11). Reads accept both portals (students only
 * see DRAFT rows they own - the service answers 404 otherwise). Creation is
 * open to both portals; the service pins students to their own institute.
 * PATCH is open to both portals too: the service enforces ownership (a
 * student may only edit/publish a draft they created; everything else is
 * admin-only). DELETE is open to admins (in scope) and to students for any
 * interview visible in their institute scope. Nested sub-resource
 * lists are wired here so `/interviews/:id/rounds` and
 * `/interviews/:id/applications` live with their parent.
 *
 * Mounted at /interviews -> /api/v1/interviews
 *
 * GET    /interviews                             -> 200 (paginated)
 * POST   /interviews                             -> 201 | 422
 * GET    /interviews/:interviewId                -> 200 | 404
 * PATCH  /interviews/:interviewId                -> 200 | 403 | 404
 * DELETE /interviews/:interviewId                -> 204 | 403 | 404
 * POST   /interviews/:interviewId/generate-questions     -> 200 preview | 503
 * POST   /interviews/:interviewId/generate-description   -> 200 draft | 503
 * POST   /interviews/:interviewId/analyze                -> 200 wizard analysis (draft owner or admin) | 403 | 404 | 422 | 503
 * GET    /interviews/:interviewId/rounds         -> 200 (paginated)
 * POST   /interviews/:interviewId/rounds         -> 201 | 404 (published only)
 * GET    /interviews/:interviewId/notes          -> 200 (paginated, both portals)
 * POST   /interviews/:interviewId/notes          -> 201 (both portals)
 * DELETE /interviews/:interviewId/notes/:noteId  -> 204 | 404
 * GET    /interviews/:interviewId/applications   -> 200 (admin pipeline)
 *
 * The AI endpoints return un-persisted previews: commit questions through
 * `POST /rounds/:roundId/questions/batch` and the description through the
 * normal PATCH above.
 */
export const interviewRouter = Router();

interviewRouter.get(
  "/",
  protect,
  validate({ query: listInterviewsQuery }),
  interviewController.list,
);
interviewRouter.post(
  "/",
  protect,
  validate({ body: createInterviewSchema }),
  interviewController.create,
);
interviewRouter.get(
  "/:interviewId",
  protect,
  validate({ params: interviewParams }),
  interviewController.getById,
);
interviewRouter.patch(
  "/:interviewId",
  protect,
  validate({ params: interviewParams, body: updateInterviewSchema }),
  interviewController.update,
);
interviewRouter.delete(
  "/:interviewId",
  protect,
  validate({ params: interviewParams }),
  interviewController.remove,
);

// ---- AI generation (preview only - nothing is persisted) -------------
interviewRouter.post(
  "/:interviewId/generate-questions",
  protect,
  authorize("admin"),
  aiLimiter,
  validate({ params: interviewParams, body: generateQuestionsSchema }),
  aiController.previewQuestions,
);
interviewRouter.post(
  "/:interviewId/generate-description",
  protect,
  authorize("admin"),
  aiLimiter,
  validate({ params: interviewParams, body: draftDescriptionSchema }),
  aiController.draftDescription,
);
// Wizard analysis: draft owner or admin (students are the primary wizard
// users). No body knobs - the draft row itself is the input.
interviewRouter.post(
  "/:interviewId/analyze",
  protect,
  aiLimiter,
  validate({ params: interviewParams }),
  aiController.analyzeDraft,
);

// ---- Nested rounds ---------------------------------------------------
interviewRouter.get(
  "/:interviewId/rounds",
  protect,
  validate({ params: interviewParams, query: listRoundsQuery }),
  roundController.listByInterview,
);
interviewRouter.post(
  "/:interviewId/rounds",
  protect,
  validate({ params: interviewParams, body: createRoundSchema }),
  roundController.create,
);

// ---- Nested notes (both portals; students own their notes) ------------
const listNotesQuery = listQuery({ sortFields: ["createdAt"], defaultSort: "createdAt" });

interviewRouter.get(
  "/:interviewId/notes",
  protect,
  validate({ params: interviewParams, query: listNotesQuery }),
  interviewController.listNotes,
);
interviewRouter.post(
  "/:interviewId/notes",
  protect,
  validate({ params: interviewParams, body: createNoteSchema }),
  interviewController.createNote,
);
interviewRouter.delete(
  "/:interviewId/notes/:noteId",
  protect,
  validate({ params: noteParams }),
  interviewController.removeNote,
);

// ---- Nested applications (admin pipeline view) -----------------------
interviewRouter.get(
  "/:interviewId/applications",
  protect,
  authorize("admin"),
  validate({ params: interviewParams, query: listApplicationsQuery }),
  applicationController.listByInterview,
);
