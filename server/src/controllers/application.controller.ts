import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { applicationService } from "../services/application.service";
import type { ApplicationStatus, ListParams } from "../types/entities.types";
import { actorOf, param } from "../utils/request.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Student application controllers (PDF 12: thin). The nested lists
 * (`/interviews/:interviewId/applications`, `/students/:studentId/applications`)
 * are wired from those route files into the handlers below.
 */
export const applicationController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 201, await applicationService.create(actorOf(req), req.body));
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListParams & {
      interviewId?: string;
      studentId?: string;
      status?: ApplicationStatus;
    };
    const { items, ...meta } = await applicationService.list(actorOf(req), query, {
      interviewId: query.interviewId,
      studentId: query.studentId,
      status: query.status,
    });
    sendSuccess(res, 200, items, meta);
  }),

  listByInterview: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListParams & { status?: ApplicationStatus };
    const { items, ...meta } = await applicationService.listByInterview(
      actorOf(req),
      param(req, "interviewId"),
      query,
      { status: query.status },
    );
    sendSuccess(res, 200, items, meta);
  }),

  listByStudent: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListParams & { status?: ApplicationStatus };
    const { items, ...meta } = await applicationService.listByStudent(
      actorOf(req),
      param(req, "studentId"),
      query,
      { status: query.status },
    );
    sendSuccess(res, 200, items, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await applicationService.getById(actorOf(req), param(req, "applicationId")),
    );
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await applicationService.updateStatus(actorOf(req), param(req, "applicationId"), req.body),
    );
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await applicationService.remove(actorOf(req), param(req, "applicationId"));
    res.status(204).end();
  }),
};
