import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { organizationService } from "../services/organization.service";
import type { ListParams } from "../types/entities.types";
import { actorOf, param } from "../utils/request.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Organization controllers (PDF 12: thin - parse, call service, serialise).
 * The route mounts `protect + authorizeRoles("SUPER_ADMIN")` in front of
 * every handler, so only a super-admin session reaches the service.
 */
export const organizationController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, ...meta } = await organizationService.list(
      actorOf(req),
      req.query as unknown as ListParams,
    );
    sendSuccess(res, 200, items, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await organizationService.getById(actorOf(req), param(req, "organizationId")),
    );
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, 201, await organizationService.create(actorOf(req), req.body));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await organizationService.update(actorOf(req), param(req, "organizationId"), req.body),
    );
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await organizationService.remove(actorOf(req), param(req, "organizationId"));
    res.status(204).end();
  }),
};
