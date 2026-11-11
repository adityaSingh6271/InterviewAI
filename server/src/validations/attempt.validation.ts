import Joi from "joi";
import { STUDENT_ATTEMPT_TARGETS } from "../types/entities.types";
import { idParams, listQuery } from "./common.validation";

/**
 * Round attempt request schemas (PDF 9). A student starts an attempt with
 * `POST /round-attempts { roundId }` and submits it by moving its status to
 * COMPLETED; admins may move it on to EVALUATED after scoring.
 */

export const attemptParams = idParams("attemptId");

export const startAttemptSchema = Joi.object({
  roundId: Joi.string().uuid().required().messages({
    "string.uuid": "roundId must be a valid UUID",
    "any.required": "roundId is required",
  }),
}).required();

/**
 * Status transition only - `attemptNumber`/`startedAt`/`submittedAt` are
 * owned by the service, never client input (mass-assignment prevention).
 */
export const updateAttemptSchema = Joi.object({
  status: Joi.string()
    .valid(...STUDENT_ATTEMPT_TARGETS, "EVALUATED")
    .required()
    .messages({
      "any.only": "status must be COMPLETED or EVALUATED",
      "any.required": "status is required",
    }),
}).required();

export const listAttemptsQuery = listQuery({
  sortFields: ["startedAt", "createdAt", "status"],
  defaultSort: "startedAt",
}).concat(
  Joi.object({
    status: Joi.string().valid("IN_PROGRESS", "COMPLETED", "EVALUATED").optional(),
    roundId: Joi.string().uuid().optional(),
    interviewId: Joi.string().uuid().optional(),
    studentId: Joi.string().uuid().optional(),
  }),
);
