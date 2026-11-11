import Joi from "joi";
import { APPLICATION_STATUSES } from "../types/entities.types";
import { idParams, listQuery } from "./common.validation";

/**
 * Student application request schemas (PDF 9). Students create applications
 * (interviewId in the body); admins update the pipeline status; both may
 * read their own rows, only admins list per interview.
 */

export const applicationParams = idParams("applicationId");

export const listByInterviewParams = idParams("interviewId");
export const listByStudentParams = idParams("studentId");

export const createApplicationSchema = Joi.object({
  interviewId: Joi.string().uuid().required().messages({
    "string.uuid": "interviewId must be a valid UUID",
    "any.required": "interviewId is required",
  }),
  resumeFileUrl: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .max(2048)
    .optional()
    .messages({
      "string.uri": "resumeFileUrl must be an http(s) URL",
      "string.max": "resumeFileUrl must be at most 2048 characters",
    }),
  resumeText: Joi.string().max(50_000).optional().messages({
    "string.max": "resumeText must be at most 50000 characters",
  }),
}).required();

export const updateApplicationSchema = Joi.object({
  status: Joi.string()
    .valid(...APPLICATION_STATUSES)
    .required()
    .messages({
      "any.only": `status must be one of: ${APPLICATION_STATUSES.join(", ")}`,
      "any.required": "status is required",
    }),
}).required();

export const listApplicationsQuery = listQuery({
  sortFields: ["appliedAt", "status", "createdAt"],
  defaultSort: "appliedAt",
}).concat(
  Joi.object({
    status: Joi.string()
      .valid(...APPLICATION_STATUSES)
      .optional(),
    interviewId: Joi.string().uuid().optional(),
    studentId: Joi.string().uuid().optional(),
  }),
);
