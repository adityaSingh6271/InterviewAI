import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { studentService } from "../services/student.service";
import type { ListParams } from "../types/entities.types";
import { actorOf, param } from "../utils/request.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Student controllers (PDF 12: thin). List/create/delete sit behind
 * `authorize("admin")` at the route; getOne/update accept both portals and
 * let the service decide self-vs-admin scope (404 for strangers).
 */
export const studentController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListParams & { instituteId?: string };
    const { items, ...meta } = await studentService.list(actorOf(req), query, {
      instituteId: query.instituteId,
    });
    sendSuccess(res, 200, items, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 200, await studentService.getById(actorOf(req), param(req, "studentId")));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 201, await studentService.create(actorOf(req), req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await studentService.update(actorOf(req), param(req, "studentId"), req.body),
    );
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await studentService.remove(actorOf(req), param(req, "studentId"));
    res.status(204).end();
  }),
};
