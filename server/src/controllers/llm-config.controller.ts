import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { llmConfigService } from "../services/llm-config.service";
import type { ListParams } from "../types/entities.types";
import { actorOf, param } from "../utils/request.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Organization LLM config controllers (PDF 12: thin). Nested under
 * `/organizations/:organizationId/llm-configs`; SUPER_ADMIN-only at the
 * route. Responses never contain the API key.
 */
export const llmConfigController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, ...meta } = await llmConfigService.list(
      actorOf(req),
      param(req, "organizationId"),
      req.query as unknown as ListParams,
    );
    sendSuccess(res, 200, items, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await llmConfigService.getById(
        actorOf(req),
        param(req, "organizationId"),
        param(req, "llmConfigId"),
      ),
    );
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      201,
      await llmConfigService.create(actorOf(req), param(req, "organizationId"), req.body),
    );
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      200,
      await llmConfigService.update(
        actorOf(req),
        param(req, "organizationId"),
        param(req, "llmConfigId"),
        req.body,
      ),
    );
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await llmConfigService.remove(
      actorOf(req),
      param(req, "organizationId"),
      param(req, "llmConfigId"),
    );
    res.status(204).end();
  }),
};
