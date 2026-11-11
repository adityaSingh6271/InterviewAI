import Joi from "joi";
import { idParams, listQuery, optionalName, requiredName } from "./common.validation";

/**
 * Student request schemas (PDF 9). Admins manage students of their own
 * institute; students may read/update their own profile (name, email,
 * password) - `instituteId` moves are admin-only and rank-checked.
 */

export const studentParams = idParams("studentId");

export const createStudentSchema = Joi.object({
  name: requiredName(120),
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .max(254)
    .required()
    .messages({
      "string.email": "email must be a valid email address",
      "any.required": "email is required",
    }),
  password: Joi.string()
    .min(8)
    .max(72)
    .required()
    .messages({
      "string.min": "password must be at least 8 characters",
      "string.max": "password must be at most 72 characters",
      "any.required": "password is required",
    }),
  /** Target institute - defaults to the acting admin's institute. */
  instituteId: Joi.string().uuid().optional(),
}).required();

export const updateStudentSchema = Joi.object({
  name: optionalName(120),
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .max(254)
    .optional()
    .messages({ "string.email": "email must be a valid email address" }),
  password: Joi.string().min(8).max(72).optional().messages({
    "string.min": "password must be at least 8 characters",
    "string.max": "password must be at most 72 characters",
  }),
  instituteId: Joi.string().uuid().optional(),
})
  .min(1)
  .required()
  .messages({ "object.min": "at least one field is required" });

export const listStudentsQuery = listQuery({
  sortFields: ["createdAt", "name", "email"],
  defaultSort: "createdAt",
}).concat(
  Joi.object({
    instituteId: Joi.string().uuid().optional(),
  }),
);
