import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { roundService } from "../services/round.service";
import type { ListParams } from "../types/entities.types";
import { actorOf, param } from "../utils/request.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Round controllers (PDF 12: thin). `listByInterview`/`create` back the
 * nested routes under `/interviews/:interviewId/rounds`; the rest serve
 * `/rounds`. The question and attempt sub-resource lists are wired from
 * `round.routes.ts` into their own controllers.
 */
export const roundController = {
  listByInterview: asyncHandler(async (req: Request, res: Response) => {
    const { items, ...meta } = await roundService.listByInterview(
      actorOf(req),
      param(req, "interviewId"),
      req.query as unknown as ListParams,
    );
    sendSuccess(res, 200, items, meta);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      201,
      await roundService.create(actorOf(req), param(req, "interviewId"), req.body),
    );
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 200, await roundService.getById(actorOf(req), param(req, "roundId")));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 200, await roundService.update(actorOf(req), param(req, "roundId"), req.body));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await roundService.remove(actorOf(req), param(req, "roundId"));
    res.status(204).end();
  }),
};
