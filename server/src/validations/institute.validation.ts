import Joi from "joi";
import { idParams, listQuery, optionalName, requiredName } from "./common.validation";

/**
 * Institute request schemas (PDF 9). `joinCode` is the invite code students
 * enter at self-registration - optional on create (the service generates one
 * when absent), regeneratable on update.
 */

export const instituteParams = idParams("instituteId");

const joinCode = Joi.string()
  .trim()
  .uppercase()
  .min(3)
  .max(64)
  .pattern(/^[A-Z0-9]+$/)
  .messages({
    "string.pattern.base": "joinCode must be alphanumeric (A-Z, 0-9)",
    "string.min": "joinCode must be at least 3 characters",
    "string.max": "joinCode must be at most 64 characters",
  });

export const createInstituteSchema = Joi.object({
  organizationId: Joi.string().uuid().optional(),
  name: requiredName(160),
  joinCode: joinCode.optional(),
}).required();

export const updateInstituteSchema = Joi.object({
  name: optionalName(160),
  joinCode: joinCode.optional(),
  organizationId: Joi.string().uuid().optional(),
})
  .min(1)
  .required()
  .messages({ "object.min": "at least one field is required" });

export const listInstitutesQuery = listQuery({
  sortFields: ["createdAt", "name"],
  defaultSort: "createdAt",
}).concat(
  Joi.object({
    organizationId: Joi.string().uuid().optional(),
  }),
);
