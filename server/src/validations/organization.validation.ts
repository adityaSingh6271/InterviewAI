import Joi from "joi";
import { idParams, listQuery, optionalName, requiredName } from "./common.validation";

/**
 * Organization + organization LLM config request schemas (PDF 9).
 * Both resources are SUPER_ADMIN-only; nested under
 * `/organizations/:organizationId/llm-configs`.
 */

export const organizationParams = idParams("organizationId");

export const llmConfigParams = idParams("organizationId", "llmConfigId");

export const createOrganizationSchema = Joi.object({
  name: requiredName(160),
}).required();

export const updateOrganizationSchema = Joi.object({
  name: optionalName(160),
})
  .min(1)
  .required()
  .messages({ "object.min": "at least one field is required" });

export const listOrganizationsQuery = listQuery({
  sortFields: ["createdAt", "name"],
  defaultSort: "createdAt",
});

/**
 * API key is write-only: accepted on create/update, encrypted at rest,
 * and never returned by any read endpoint.
 */
export const createLlmConfigSchema = Joi.object({
  provider: requiredName(60, "provider"),
  modelName: requiredName(120, "modelName"),
  apiKey: Joi.string()
    .trim()
    .min(8)
    .max(512)
    .required()
    .messages({
      "string.min": "apiKey must be at least 8 characters",
      "string.max": "apiKey must be at most 512 characters",
      "any.required": "apiKey is required",
    }),
  settings: Joi.object()
    .unknown(true)
    .default(null)
    .messages({ "object.base": "settings must be an object" }),
  isActive: Joi.boolean().default(false),
}).required();

export const updateLlmConfigSchema = Joi.object({
  provider: optionalName(60, "provider"),
  modelName: optionalName(120, "modelName"),
  apiKey: Joi.string().trim().min(8).max(512).optional(),
  settings: Joi.object().unknown(true).optional(),
  isActive: Joi.boolean().optional(),
})
  .min(1)
  .required()
  .messages({ "object.min": "at least one field is required" });

export const listLlmConfigsQuery = listQuery({
  sortFields: ["createdAt", "provider", "modelName"],
  defaultSort: "createdAt",
});
