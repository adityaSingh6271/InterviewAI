import Joi from "joi";

/**
 * Shared validation pieces for the CRUD routes (PDF 9): UUID path params and
 * the standard list query (page/limit/sort/order/q). Applied through the
 * shared `validate(...)` middleware, which also strips unknown keys, coerces
 * numbers, and turns failures into a 422 with field-level details.
 */

/** Path param carrying an id (ids are uuid strings in TEXT columns). */
export function idParam(name: string): Joi.StringSchema {
  return Joi.string()
    .uuid()
    .required()
    .messages({
      "string.uuid": `${name} must be a valid UUID`,
      "any.required": `${name} is required`,
    });
}

/** Path params for a nested resource, e.g. `{ interviewId, roundId }`. */
export function idParams(...names: string[]): Joi.ObjectSchema {
  const shape: Record<string, Joi.StringSchema> = {};
  for (const name of names) shape[name] = idParam(name);
  return Joi.object(shape).required();
}

export type ListQueryOptions = {
  /** Allowlisted sort keys - must match the repository's sortColumns map. */
  sortFields: readonly string[];
  defaultSort: string;
};

/**
 * Standard list query (Standards PDF 27): page >= 1, limit <= 100, sort
 * fields allowlisted, order asc|desc, optional free-text `q`.
 */
export function listQuery(options: ListQueryOptions): Joi.ObjectSchema {
  return Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string()
      .valid(...options.sortFields)
      .default(options.defaultSort),
    order: Joi.string().valid("asc", "desc").default("desc"),
    q: Joi.string().trim().max(200).optional(),
  });
}

/** Reusable trimmed required string with a length cap. */
export function requiredName(max: number, label = "name"): Joi.StringSchema {
  return Joi.string()
    .trim()
    .min(1)
    .max(max)
    .required()
    .messages({
      "string.empty": `${label} must not be empty`,
      "string.max": `${label} must be at most ${max} characters`,
      "any.required": `${label} is required`,
    });
}

/** Reusable optional trimmed string with a length cap. */
export function optionalText(max: number, label: string): Joi.StringSchema {
  return Joi.string()
    .trim()
    .max(max)
    .optional()
    .messages({
      "string.max": `${label} must be at most ${max} characters`,
    });
}

/**
 * Reusable optional non-empty string - the PATCH counterpart of
 * `requiredName`: every field of an update schema must be optional so a
 * client can change one field without resending the rest (the object's
 * `.min(1)` still guarantees at least one field).
 */
export function optionalName(max: number, label = "name"): Joi.StringSchema {
  return Joi.string()
    .trim()
    .min(1)
    .max(max)
    .optional()
    .messages({
      "string.empty": `${label} must not be empty`,
      "string.max": `${label} must be at most ${max} characters`,
    });
}
