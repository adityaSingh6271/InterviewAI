import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { questionService } from "../services/question.service";
import type { Difficulty, ListParams } from "../types/entities.types";
import { actorOf, param } from "../utils/request.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Question controllers (PDF 12: thin). `listByRound`/`create` back the
 * nested routes under `/rounds/:roundId/questions`; the rest serve
 * `/questions`.
 */
export const questionController = {
  listByRound: asyncHandler(async (req: Request, res: Response) => {
    const { items, ...meta } = await questionService.listByRound(
      actorOf(req),
      param(req, "roundId"),
      req.query as unknown as ListParams,
    );
    sendSuccess(res, 200, items, meta);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      201,
      await questionService.create(actorOf(req), param(req, "roundId"), req.body),
    );
  }),

  /** Bulk commit of a previewed/hand-written question batch - 201. */
  createBatch: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as {
      questions: Array<{ prompt: string; expectedKeywords?: string[]; difficulty: Difficulty }>;
    };
    sendSuccess(
      res,
      201,
      await questionService.createBatch(actorOf(req), param(req, "roundId"), body.questions),
    );
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 200, await questionService.getById(actorOf(req), param(req, "questionId")));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await questionService.update(actorOf(req), param(req, "questionId"), req.body),
    );
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await questionService.remove(actorOf(req), param(req, "questionId"));
    res.status(204).end();
  }),
};
