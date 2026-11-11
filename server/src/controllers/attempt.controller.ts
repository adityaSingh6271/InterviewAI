import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { attemptService } from "../services/attempt.service";
import type { AttemptStatus, ListParams } from "../types/entities.types";
import { actorOf, param } from "../utils/request.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Round attempt controllers (PDF 12: thin). `start` backs
 * `POST /round-attempts { roundId }`; the nested list handlers serve
 * `/rounds/:roundId/attempts` and `/students/:studentId/attempts`; the
 * response sub-resource handlers serve `/round-attempts/:attemptId/responses`.
 */
export const attemptController = {
  start: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 201, await attemptService.start(actorOf(req), req.body));
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListParams & {
      roundId?: string;
      studentId?: string;
      interviewId?: string;
      status?: AttemptStatus;
    };
    const { items, ...meta } = await attemptService.list(actorOf(req), query, {
      roundId: query.roundId,
      studentId: query.studentId,
      interviewId: query.interviewId,
      status: query.status,
    });
    sendSuccess(res, 200, items, meta);
  }),

  listByRound: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListParams & { status?: AttemptStatus };
    const { items, ...meta } = await attemptService.listByRound(
      actorOf(req),
      param(req, "roundId"),
      query,
      { status: query.status },
    );
    sendSuccess(res, 200, items, meta);
  }),

  listByStudent: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListParams & { status?: AttemptStatus };
    const { items, ...meta } = await attemptService.listByStudent(
      actorOf(req),
      param(req, "studentId"),
      query,
      { status: query.status },
    );
    sendSuccess(res, 200, items, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 200, await attemptService.getById(actorOf(req), param(req, "attemptId")));
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const { attempt, evaluation } = await attemptService.updateStatus(
      actorOf(req),
      param(req, "attemptId"),
      req.body,
    );
    // Student submits report the inline AI verdict as meta
    // (`evaluation: evaluated|partial|skipped`, `failed: n`); admin
    // transitions (EVALUATED) carry no evaluation key at all.
    sendSuccess(
      res,
      200,
      attempt,
      evaluation
        ? {
            evaluation: evaluation.status,
            failed: evaluation.failed,
            ...(evaluation.reason ? { reason: evaluation.reason } : {}),
          }
        : undefined,
    );
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await attemptService.remove(actorOf(req), param(req, "attemptId"));
    res.status(204).end();
  }),

  listResponses: asyncHandler(async (req: Request, res: Response) => {
    const { items, ...meta } = await attemptService.listResponses(
      actorOf(req),
      param(req, "attemptId"),
      req.query as unknown as ListParams,
    );
    sendSuccess(res, 200, items, meta);
  }),

  createResponse: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      201,
      await attemptService.createResponse(actorOf(req), param(req, "attemptId"), req.body),
    );
  }),
};
