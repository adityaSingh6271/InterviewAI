import Joi from "joi";
import { RESUME_TEXT_MAX } from "../constants/resume.constants";
import { INTERVIEW_STATUSES } from "../types/entities.types";
import {
  idParams,
  listQuery,
  optionalName,
  optionalText,
  requiredName,
} from "./common.validation";

/**
 * Interview request schemas (PDF 9). `instituteId` is admin-only input that
 * defaults to the acting admin's institute (never trusted from students).
 *
 * The rich-profile fields (targetRole/company/.../resume/extractedJobData/
 * matchAnalysis) carry the student-portal wizard payload. The jsonb
 * artifacts are accepted as free-form objects validated by shape at the
 * edges, except `resume`, which is shape-checked (extracted text only, capped)
 * so raw file bytes can never reach the database through this schema.
 */

/** Loose jsonb artifact: any object; capped to keep payloads sane. */
function jsonArtifact(label: string): Joi.ObjectSchema {
  return Joi.object()
    .unknown(true)
    .max(100)
    .optional()
    .messages({
      "object.max": `${label} has too many keys`,
      "object.base": `${label} must be an object`,
    });
}

/**
 * Resume artifact: extracted data ONLY - name/type/content/size/mimeType -
 * never raw file bytes. The `content` cap (same as StudentApplication's
 * resumeText) is the structural guard that keeps a single wizard request
 * far below the 1mb JSON body limit, so an oversized resume is a 422 with
 * a field message instead of an opaque 413.
 */
function resumeArtifact(): Joi.ObjectSchema {
  return Joi.object({
    name: Joi.string().max(255).optional().messages({
      "string.max": "resume.name must be at most 255 characters",
    }),
    type: Joi.string().valid("uploaded", "text").optional().messages({
      "any.only": 'resume.type must be "uploaded" or "text"',
    }),
    content: Joi.string().max(RESUME_TEXT_MAX).optional().messages({
      "string.max": `resume.content must be at most ${RESUME_TEXT_MAX} characters (upload the file to /resumes for extraction)`,
    }),
    size: Joi.number().integer().min(0).max(10 * 1024 * 1024).optional().messages({
      "number.max": "resume.size must be at most 10MB",
    }),
    mimeType: Joi.string().max(100).optional().messages({
      "string.max": "resume.mimeType must be at most 100 characters",
    }),
    parsedData: Joi.object().unknown(true).optional(),
  })
    .unknown(true)
    .max(100)
    .optional()
    .messages({
      "object.max": "resume has too many keys",
      "object.base": "resume must be an object",
    });
}

export const interviewParams = idParams("interviewId");

export const createInterviewSchema = Joi.object({
  title: requiredName(200, "title"),
  description: Joi.string().trim().max(4000).optional().messages({
    "string.max": "description must be at most 4000 characters",
  }),
  jobRequirements: Joi.string().trim().max(8000).optional().messages({
    "string.max": "jobRequirements must be at most 8000 characters",
  }),
  status: Joi.string()
    .valid(...INTERVIEW_STATUSES)
    .default("DRAFT"),
  targetRole: optionalText(200, "targetRole"),
  company: optionalText(120, "company"),
  category: optionalText(120, "category"),
  industry: optionalText(120, "industry"),
  experienceLevel: optionalText(80, "experienceLevel"),
  sessionDurationMinutes: Joi.number().integer().min(1).max(600).optional().messages({
    "number.min": "sessionDurationMinutes must be at least 1",
    "number.max": "sessionDurationMinutes must be at most 600",
  }),
  eligibilityStatus: optionalText(60, "eligibilityStatus"),
  overallProgress: Joi.number().integer().min(0).max(100).default(0),
  resume: resumeArtifact(),
  extractedJobData: jsonArtifact("extractedJobData"),
  matchAnalysis: jsonArtifact("matchAnalysis"),
  instituteId: Joi.string().uuid().optional(),
}).required();

export const updateInterviewSchema = Joi.object({
  title: optionalName(200, "title"),
  description: Joi.string().allow(null, "").max(4000).optional(),
  jobRequirements: Joi.string().allow(null, "").max(8000).optional(),
  status: Joi.string().valid(...INTERVIEW_STATUSES).optional(),
  targetRole: optionalText(200, "targetRole").allow(null, ""),
  company: optionalText(120, "company").allow(null, ""),
  category: optionalText(120, "category").allow(null, ""),
  industry: optionalText(120, "industry").allow(null, ""),
  experienceLevel: optionalText(80, "experienceLevel").allow(null, ""),
  sessionDurationMinutes: Joi.number().integer().min(1).max(600).allow(null).optional(),
  eligibilityStatus: optionalText(60, "eligibilityStatus").allow(null, ""),
  overallProgress: Joi.number().integer().min(0).max(100).optional(),
  resume: resumeArtifact().allow(null),
  extractedJobData: jsonArtifact("extractedJobData").allow(null),
  matchAnalysis: jsonArtifact("matchAnalysis").allow(null),
})
  .min(1)
  .required()
  .messages({ "object.min": "at least one field is required" });

export const listInterviewsQuery = listQuery({
  sortFields: ["createdAt", "title", "status"],
  defaultSort: "createdAt",
}).concat(
  Joi.object({
    status: Joi.string()
      .valid(...INTERVIEW_STATUSES)
      .optional(),
    instituteId: Joi.string().uuid().optional(),
  }),
);

// ---- Notes (nested under /interviews/:interviewId/notes) ---------------

export const noteParams = idParams("interviewId", "noteId");

export const createNoteSchema = Joi.object({
  content: Joi.string().trim().min(1).max(4000).required().messages({
    "string.empty": "content must not be empty",
    "string.max": "content must be at most 4000 characters",
    "any.required": "content is required",
  }),
  roundId: Joi.string().uuid().optional().messages({
    "string.uuid": "roundId must be a valid UUID",
  }),
}).required();
