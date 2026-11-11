import Joi from "joi";

/**
 * Auth request schemas (PDF 9: Joi schemas for body/query/params, custom
 * field-level messages, sanitisation). Applied by `validate(...)` which also
 * strips unknown keys, trims strings, and turns failures into a 422.
 *
 * Two-portal model: every auth body carries `portal` - register accepts only
 * "student" (admins are seeded), login accepts both portals.
 */

const email = Joi.string()
  .trim()
  .email({ tlds: { allow: false } })
  .max(254)
  .required()
  .messages({
    "string.email": "email must be a valid email address",
    "string.max": "email must be at most 254 characters",
    "any.required": "email is required",
  });

const password = Joi.string()
  .min(8)
  .max(72)
  .required()
  .messages({
    "string.min": "password must be at least 8 characters",
    "string.max": "password must be at most 72 characters",
    "any.required": "password is required",
  });
// Note: no `.trim()` here on purpose - passwords are byte-exact, trimming one
// would silently change credentials. Email above does trim.

const name = Joi.string()
  .trim()
  .min(1)
  .max(120)
  .required()
  .messages({
    "string.empty": "name must not be empty",
    "string.max": "name must be at most 120 characters",
    "any.required": "name is required",
  });

const instituteCode = Joi.string()
  .trim()
  .min(3)
  .max(64)
  .required()
  .messages({
    "string.min": "instituteCode must be at least 3 characters",
    "string.max": "instituteCode must be at most 64 characters",
    "any.required": "instituteCode is required",
  });

/**
 * Student self-registration. The portal is whitelisted to "student" -
 * PDF 11 forbids trusting client-supplied roles, and admin accounts are
 * provisioned out of band (seed script), never through the public API.
 */
export const registerSchema = Joi.object({
  portal: Joi.string().valid("student").required().messages({
    "any.only": "portal must be 'student' (admin accounts are seeded)",
    "any.required": "portal is required",
  }),
  name,
  email,
  password,
  instituteCode,
}).required();

/**
 * Login only requires presence for the password - an existing account may
 * predate today's policy, and enforcing register policy here would leak
 * "this account exists" through differing error messages.
 */
export const loginSchema = Joi.object({
  portal: Joi.string().valid("student", "admin").required().messages({
    "any.only": "portal must be 'student' or 'admin'",
    "any.required": "portal is required",
  }),
  email,
  password: Joi.string().min(1).max(72).required().messages({
    "string.max": "password must be at most 72 characters",
    "any.required": "password is required",
  }),
}).required();
