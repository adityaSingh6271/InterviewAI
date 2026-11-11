import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { interviewService } from "../services/interview.service";
import type { InterviewStatus, ListParams } from "../types/entities.types";
import { actorOf, param } from "../utils/request.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Interview controllers (PDF 12: thin). Nested list routes
 * (`/:interviewId/rounds`, `/:interviewId/applications`) live in the round
 * and application controllers and are wired from `interview.routes.ts`.
 */
export const interviewController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListParams & {
      status?: InterviewStatus;
      instituteId?: string;
    };
    const { items, ...meta } = await interviewService.list(actorOf(req), query, {
      status: query.status,
      instituteId: query.instituteId,
    });
    sendSuccess(res, 200, items, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 200, await interviewService.getById(actorOf(req), param(req, "interviewId")));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 201, await interviewService.create(actorOf(req), req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await interviewService.update(actorOf(req), param(req, "interviewId"), req.body),
    );
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await interviewService.remove(actorOf(req), param(req, "interviewId"));
    res.status(204).end();
  }),

  // ---- Notes -----------------------------------------------------------

  listNotes: asyncHandler(async (req: Request, res: Response) => {
    const params = req.query as unknown as ListParams;
    const { items, ...meta } = await interviewService.listNotes(
      actorOf(req),
      param(req, "interviewId"),
      params,
    );
    sendSuccess(res, 200, items, meta);
  }),

  createNote: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      201,
      await interviewService.createNote(actorOf(req), param(req, "interviewId"), req.body),
    );
  }),

  removeNote: asyncHandler(async (req: Request, res: Response) => {
    await interviewService.removeNote(
      actorOf(req),
      param(req, "interviewId"),
      param(req, "noteId"),
    );
    res.status(204).end();
  }),
};
