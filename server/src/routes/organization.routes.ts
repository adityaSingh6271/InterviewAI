import { Router } from "express";
import { llmConfigController } from "../controllers/llm-config.controller";
import { organizationController } from "../controllers/organization.controller";
import { authorizeRoles, protect } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  createLlmConfigSchema,
  createOrganizationSchema,
  listLlmConfigsQuery,
  listOrganizationsQuery,
  llmConfigParams,
  organizationParams,
  updateLlmConfigSchema,
  updateOrganizationSchema,
} from "../validations/organization.validation";

/**
 * Organization routes (PDF 8: plural, lowercase, versioned via the mount;
 * PDF 11: deny by default) - SUPER_ADMIN only end to end.
 *
 * Mounted at /organizations -> /api/v1/organizations
 *
 * GET    /                                           -> list (paginated)
 * POST   /                                           -> 201
 * GET    /:organizationId                            -> 200 | 404
 * PATCH  /:organizationId                            -> 200 | 404
 * DELETE /:organizationId                            -> 204 | 404
 * GET    /:organizationId/llm-configs                -> list (paginated)
 * POST   /:organizationId/llm-configs                -> 201
 * GET    /:organizationId/llm-configs/:llmConfigId   -> 200 | 404
 * PATCH  /:organizationId/llm-configs/:llmConfigId   -> 200 | 404
 * DELETE /:organizationId/llm-configs/:llmConfigId   -> 204 | 404
 *
 * The LLM config routes are flat paths on the same router (no sub-router
 * needed): `/:organizationId` is single-segment, so it can never swallow
 * `/:organizationId/llm-configs`. API keys are write-only - never returned.
 */
export const organizationRouter = Router();

organizationRouter.use(protect, authorizeRoles("SUPER_ADMIN"));

organizationRouter.get(
  "/",
  validate({ query: listOrganizationsQuery }),
  organizationController.list,
);
organizationRouter.post(
  "/",
  validate({ body: createOrganizationSchema }),
  organizationController.create,
);
organizationRouter.get(
  "/:organizationId",
  validate({ params: organizationParams }),
  organizationController.getById,
);
organizationRouter.patch(
  "/:organizationId",
  validate({ params: organizationParams, body: updateOrganizationSchema }),
  organizationController.update,
);
organizationRouter.delete(
  "/:organizationId",
  validate({ params: organizationParams }),
  organizationController.remove,
);

// ---- Nested LLM configs ---------------------------------------------
organizationRouter.get(
  "/:organizationId/llm-configs",
  validate({ params: organizationParams, query: listLlmConfigsQuery }),
  llmConfigController.list,
);
organizationRouter.post(
  "/:organizationId/llm-configs",
  validate({ params: organizationParams, body: createLlmConfigSchema }),
  llmConfigController.create,
);
organizationRouter.get(
  "/:organizationId/llm-configs/:llmConfigId",
  validate({ params: llmConfigParams }),
  llmConfigController.getById,
);
organizationRouter.patch(
  "/:organizationId/llm-configs/:llmConfigId",
  validate({ params: llmConfigParams, body: updateLlmConfigSchema }),
  llmConfigController.update,
);
organizationRouter.delete(
  "/:organizationId/llm-configs/:llmConfigId",
  validate({ params: llmConfigParams }),
  llmConfigController.remove,
);
