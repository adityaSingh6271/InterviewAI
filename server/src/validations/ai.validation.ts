import Joi from "joi";
import { DIFFICULTIES } from "../types/entities.types";
import { createQuestionSchema } from "./question.validation";

/**
 * AI request schemas (PDF 9). Generation bodies are small and strict: the
 * model-facing knobs (`count`, `difficulty`, `topics`) are validated here so
 * the prompt layer only ever sees bounded input.
 */

/** `POST /interviews/:interviewId/generate-questions` */
export const generateQuestionsSchema = Joi.object({
  count: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .default(5)
    .messages({
      "number.base": "count must be a number",
      "number.min": "count must be at least 1",
      "number.max": "count must be at most 20",
    }),
  difficulty: Joi.string().valid(...DIFFICULTIES).optional(),
  topics: Joi.string().trim().max(500).optional().messages({
    "string.max": "topics must be at most 500 characters",
  }),
  /** Must belong to this interview (checked in the service -> 404). */
  roundId: Joi.string().uuid().optional(),
}).required();

/** `POST /interviews/:interviewId/generate-description` */
export const draftDescriptionSchema = Joi.object({
  focus: Joi.string().trim().max(500).optional().messages({
    "string.max": "focus must be at most 500 characters",
  }),
}).required();

/**
 * `POST /rounds/:roundId/questions/batch` - the commit half of
 * preview-then-confirm. Reuses the single-question schema so a previewed
 * question and a hand-written one pass identical validation (cap of 20 to
 * match the generation limit).
 */
export const batchCreateQuestionsSchema = Joi.object({
  questions: Joi.array()
    .items(createQuestionSchema)
    .min(1)
    .max(20)
    .required()
    .messages({
      "array.min": "questions must hold at least 1 entry",
      "array.max": "questions must hold at most 20 entries",
      "any.required": "questions is required",
    }),
}).required();
