import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { adminService } from "../services/admin.service";
import type { ListParams } from "../types/entities.types";
import { actorOf, param } from "../utils/request.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Admin controllers (PDF 12: thin). Two groups:
 * - `getStats` behind `protect + authorize("admin")` (admin portal);
 * - account CRUD (`/admins`), where the route guarantees an admin session
 *   and the service enforces role ranks and institute scope (PDF 11).
 */
export const adminController = {
  getStats: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 200, await adminService.stats(actorOf(req)));
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListParams & { instituteId?: string; role?: string };
    const { items, ...meta } = await adminService.list(actorOf(req), query, {
      instituteId: query.instituteId,
      role: query.role,
    });
    sendSuccess(res, 200, items, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 200, await adminService.getById(actorOf(req), param(req, "adminId")));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 201, await adminService.create(actorOf(req), req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await adminService.update(actorOf(req), param(req, "adminId"), req.body),
    );
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await adminService.remove(actorOf(req), param(req, "adminId"));
    res.status(204).end();
  }),
};
