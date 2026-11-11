import Joi from "joi";
import { ADMIN_ROLES } from "../types/entities.types";
import { idParams, listQuery, optionalName, requiredName } from "./common.validation";

/**
 * Admin account request schemas (PDF 9). Admin accounts are provisioned by
 * other admins through `POST /admins` (the public `/auth/register` endpoint
 * stays student-only); the role field is validated here but rank-checked in
 * the service so a client can never escalate privileges.
 */

export const adminAccountParams = idParams("adminId");

export const createAdminSchema = Joi.object({
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
  role: Joi.string()
    .valid(...ADMIN_ROLES)
    .default("INSTITUTE_ADMIN"),
  /** Target institute - only honoured for admins above INSTITUTE_ADMIN. */
  instituteId: Joi.string().uuid().optional(),
}).required();

export const updateAdminSchema = Joi.object({
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
  role: Joi.string().valid(...ADMIN_ROLES).optional(),
  instituteId: Joi.string().uuid().optional(),
})
  .min(1)
  .required()
  .messages({ "object.min": "at least one field is required" });

export const listAdminsQuery = listQuery({
  sortFields: ["createdAt", "name", "email", "role"],
  defaultSort: "createdAt",
}).concat(
  Joi.object({
    instituteId: Joi.string().uuid().optional(),
    role: Joi.string().valid(...ADMIN_ROLES).optional(),
  }),
);
