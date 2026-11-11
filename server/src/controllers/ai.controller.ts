import type { Request, Response } from "express";
import { aiService } from "../ai/ai.service";
import { wizardAnalysisService } from "../ai/wizard-analysis.service";
import { asyncHandler } from "../middleware/async-handler";
import type { Difficulty } from "../types/entities.types";
import { AppError } from "../utils/app-error.util";
import { actorOf, param } from "../utils/request.util";
import { sendSuccess } from "../utils/response.util";

/**
 * AI controllers (PDF 12: thin). All four generation/evaluation endpoints
 * delegate straight to `aiService`, which owns auth scope and the LLM
 * config resolution. Preview endpoints answer 200 with un-persisted
 * content; evaluation endpoints answer 200 with the updated rows.
 */
export const aiController = {
  /** `POST /interviews/:interviewId/generate-questions` -> 200 preview. */
  previewQuestions: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as {
      count: number;
      difficulty?: Difficulty;
      topics?: string;
      roundId?: string;
    };
    sendSuccess(
      res,
      200,
      await aiService.previewQuestions(actorOf(req), param(req, "interviewId"), body),
    );
  }),

  /** `POST /interviews/:interviewId/generate-description` -> 200 draft. */
  draftDescription: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { focus?: string };
    sendSuccess(
      res,
      200,
      await aiService.draftDescription(actorOf(req), param(req, "interviewId"), body),
    );
  }),

  /** `POST /rounds/:roundId/questions/ensure` -> 200 questions (generated if the round had none). */
  ensureRoundQuestions: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await aiService.ensureRoundQuestions(actorOf(req), param(req, "roundId")),
    );
  }),

  /** `POST /interviews/:interviewId/analyze` -> 200 wizard analysis (draft owner or admin). */
  analyzeDraft: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await wizardAnalysisService.analyzeDraft(
        actorOf(req),
        param(req, "interviewId"),
      ),
    );
  }),

  /** `POST /responses/:responseId/evaluate` -> 200 scored response. */
  evaluateResponse: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await aiService.evaluateResponse(actorOf(req), param(req, "responseId")),
    );
  }),

  /** `POST /round-attempts/:attemptId/evaluate` -> 200 {evaluated,failed}. */
  evaluateAttempt: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await aiService.evaluateAttempt(actorOf(req), param(req, "attemptId")),
    );
  }),

  /** `POST /round-attempts/:attemptId/transcribe` -> 200 { transcript }. */
  transcribeAttemptAudio: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw AppError.unprocessable("No audio file uploaded", [
        { field: "file", message: 'Attach a recorded audio file under the "file" field' },
      ]);
    }
    sendSuccess(
      res,
      200,
      await aiService.transcribeAttemptAudio(actorOf(req), param(req, "attemptId"), req.file),
    );
  }),
};
