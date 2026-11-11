import Joi from "joi";
import { DIFFICULTIES } from "../types/entities.types";
import { idParams, listQuery } from "./common.validation";

/**
 * Question request schemas (PDF 9). Questions live under a round
 * (`/rounds/:roundId/questions`); `expectedKeywords` is the JSONB array the
 * AI evaluator scores transcripts against.
 */

export const questionParams = idParams("questionId");

export const createQuestionSchema = Joi.object({
  prompt: Joi.string()
    .trim()
    .min(1)
    .max(4000)
    .required()
    .messages({
      "string.empty": "prompt must not be empty",
      "string.max": "prompt must be at most 4000 characters",
      "any.required": "prompt is required",
    }),
  expectedKeywords: Joi.array()
    .items(Joi.string().trim().min(1).max(120))
    .max(50)
    .optional()
    .messages({
      "array.max": "expectedKeywords must hold at most 50 entries",
      "array.base": "expectedKeywords must be an array of strings",
    }),
  difficulty: Joi.string()
    .valid(...DIFFICULTIES)
    .default("MEDIUM"),
}).required();

export const updateQuestionSchema = Joi.object({
  prompt: Joi.string().trim().min(1).max(4000).optional(),
  expectedKeywords: Joi.array()
    .items(Joi.string().trim().min(1).max(120))
    .max(50)
    .allow(null)
    .optional(),
  difficulty: Joi.string().valid(...DIFFICULTIES).optional(),
})
  .min(1)
  .required()
  .messages({ "object.min": "at least one field is required" });

export const listQuestionsQuery = listQuery({
  sortFields: ["createdAt", "difficulty"],
  defaultSort: "createdAt",
});
