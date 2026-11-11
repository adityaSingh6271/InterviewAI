import Joi from "joi";
import { idParams, listQuery } from "./common.validation";

/**
 * Response request schemas (PDF 9). A student submits a response per
 * question while the attempt is IN_PROGRESS; admins score it afterwards
 * (`aiScore`/`aiFeedback` are admin-only fields, rank-checked in the service).
 */

export const responseParams = idParams("responseId");

export const createResponseSchema = Joi.object({
  questionId: Joi.string().uuid().required().messages({
    "string.uuid": "questionId must be a valid UUID",
    "any.required": "questionId is required",
  }),
  transcript: Joi.string().allow("", null).max(50_000).optional().messages({
    "string.max": "transcript must be at most 50000 characters",
  }),
}).required();

export const updateResponseSchema = Joi.object({
  transcript: Joi.string().max(50_000).allow(null).optional(),
  aiScore: Joi.number()
    .min(0)
    .max(100)
    .allow(null)
    .optional()
    .messages({
      "number.min": "aiScore must be between 0 and 100",
      "number.max": "aiScore must be between 0 and 100",
    }),
  aiFeedback: Joi.string().max(4000).allow(null).optional().messages({
    "string.max": "aiFeedback must be at most 4000 characters",
  }),
})
  .min(1)
  .required()
  .messages({ "object.min": "at least one field is required" });

export const listResponsesQuery = listQuery({
  sortFields: ["submittedAt", "createdAt"],
  defaultSort: "submittedAt",
});
