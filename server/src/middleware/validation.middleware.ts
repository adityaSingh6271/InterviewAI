import type { Request, RequestHandler } from "express";
import Joi from "joi";
import { AppError } from "../utils/app-error.util";
import type { ErrorDetail } from "../utils/response.util";

/**
 * Request validation (PDF 9):
 * - one shared `validate(schemas)` middleware for body/query/params;
 * - Joi options enforce sanitisation and mass-assignment prevention:
 *   `stripUnknown` drops keys that are not in the schema (whitelist),
 *   `convert` coerces numbers/booleans;
 * - string trimming is declared per schema with `.trim()` - passwords
 *   deliberately stay untrimmed (mutating them would change what the user
 *   typed), email trims;
 * - `abortEarly: false` reports every bad field at once;
 * - failures become a 422 with field-level details (PDF 9: consistent 422).
 */
const JOI_OPTIONS: Joi.ValidationOptions = {
  abortEarly: false,
  stripUnknown: true,
  convert: true,
};

export type ValidationSchemas = {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
};

type TargetKey = keyof ValidationSchemas;

/**
 * Express 5 exposes `req.query` as a getter-only property, so a plain
 * assignment would throw - shadow it with a configurable own property.
 */
function assignValidated(req: Request, key: TargetKey, value: unknown): void {
  if (key === "query") {
    Object.defineProperty(req, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return;
  }
  (req as unknown as Record<string, unknown>)[key] = value;
}

/** Field label: body fields stay bare ("email"), others get their source ("query.page"). */
function fieldLabel(scope: TargetKey, path: ReadonlyArray<string | number>): string {
  const parts = path.map(String);
  return scope === "body" ? parts.join(".") || "body" : [scope, ...parts].join(".");
}

/**
 * Build the middleware for a route.
 *
 *   router.post("/login", validate({ body: loginSchema }), controller.login)
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    const details: ErrorDetail[] = [];
    const targets: Array<[TargetKey, unknown]> = [
      // `undefined` body (no payload) is treated as `{}` so required-field
      // messages name the field instead of the object type.
      ["params", req.params],
      ["query", req.query],
      ["body", req.body === undefined ? {} : req.body],
    ];

    for (const [key, rawValue] of targets) {
      const schema = schemas[key];
      if (!schema) continue;

      const { error, value } = schema.validate(rawValue, JOI_OPTIONS);
      if (error) {
        for (const detail of error.details) {
          details.push({
            field: fieldLabel(key, detail.path),
            message: detail.message,
          });
        }
      } else {
        assignValidated(req, key, value);
      }
    }

    if (details.length > 0) {
      next(AppError.unprocessable("Request validation failed", details));
      return;
    }
    next();
  };
}
