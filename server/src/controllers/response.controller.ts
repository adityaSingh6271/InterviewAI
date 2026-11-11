import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { responseService } from "../services/response.service";
import { actorOf, param } from "../utils/request.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Response controllers (PDF 12: thin) - read/evaluate/delete of submitted
 * answers. Submission lives on the attempt controller
 * (`POST /round-attempts/:attemptId/responses`).
 */
export const responseController = {
  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 200, await responseService.getById(actorOf(req), param(req, "responseId")));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await responseService.update(actorOf(req), param(req, "responseId"), req.body),
    );
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await responseService.remove(actorOf(req), param(req, "responseId"));
    res.status(204).end();
  }),
};
