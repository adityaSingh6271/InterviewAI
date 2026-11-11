import Joi from "joi";
import { ROUND_TYPES } from "../types/entities.types";
import { idParams, listQuery, optionalName, requiredName } from "./common.validation";

/**
 * Round request schemas (PDF 9). Rounds live under an interview
 * (`/interviews/:interviewId/rounds`) and own their questions.
 */

export const roundParams = idParams("roundId");

export const createRoundSchema = Joi.object({
  name: requiredName(120, "name"),
  sequenceOrder: Joi.number()
    .integer()
    .min(1)
    .max(999)
    .required()
    .messages({
      "number.base": "sequenceOrder must be a number",
      "number.min": "sequenceOrder must be at least 1",
      "any.required": "sequenceOrder is required",
    }),
  roundType: Joi.string()
    .valid(...ROUND_TYPES)
    .default("AI_CHAT"),
  description: Joi.string().trim().max(2000).optional().default("").messages({
    "string.max": "description must be at most 2000 characters",
  }),
  estimatedDurationMinutes: Joi.number().integer().min(1).max(600).allow(null).optional().messages({
    "number.min": "estimatedDurationMinutes must be at least 1",
    "number.max": "estimatedDurationMinutes must be at most 600",
  }),
  clientType: Joi.string().trim().max(60).allow(null, "").optional().messages({
    "string.max": "clientType must be at most 60 characters",
  }),
}).required();

export const updateRoundSchema = Joi.object({
  name: optionalName(120, "name"),
  sequenceOrder: Joi.number().integer().min(1).max(999).optional(),
  roundType: Joi.string().valid(...ROUND_TYPES).optional(),
  description: Joi.string().allow(null, "").max(2000).optional(),
  estimatedDurationMinutes: Joi.number().integer().min(1).max(600).allow(null).optional(),
  clientType: Joi.string().trim().max(60).allow(null, "").optional(),
})
  .min(1)
  .required()
  .messages({ "object.min": "at least one field is required" });

export const listRoundsQuery = listQuery({
  sortFields: ["sequenceOrder", "createdAt", "name"],
  defaultSort: "sequenceOrder",
});
