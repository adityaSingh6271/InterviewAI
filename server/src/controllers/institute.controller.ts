import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { instituteService } from "../services/institute.service";
import type { ListParams } from "../types/entities.types";
import { actorOf, param } from "../utils/request.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Institute controllers (PDF 12: thin). Role scope (SUPER/ORG/INSTITUTE)
 * is decided in the service; the route only guarantees an admin session.
 */
export const instituteController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListParams & { organizationId?: string };
    const { items, ...meta } = await instituteService.list(actorOf(req), query, {
      organizationId: query.organizationId,
    });
    sendSuccess(res, 200, items, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 200, await instituteService.getById(actorOf(req), param(req, "instituteId")));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 201, await instituteService.create(actorOf(req), req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await instituteService.update(actorOf(req), param(req, "instituteId"), req.body),
    );
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await instituteService.remove(actorOf(req), param(req, "instituteId"));
    res.status(204).end();
  }),
};
