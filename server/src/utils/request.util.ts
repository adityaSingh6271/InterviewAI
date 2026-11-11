import type { Request } from "express";
import type { AuthUser } from "../types/auth.types";
import { AppError } from "./app-error.util";

/**
 * The authenticated identity behind a request. Every controller that uses
 * this ran behind `protect`, so the user is always present - this helper
 * simply turns the impossible case into a typed 401 instead of a non-null
 * assertion.
 */
export function actorOf(req: Request): AuthUser {
  if (!req.user) {
    throw AppError.unauthorized("Authentication required");
  }
  return req.user;
}

/**
 * A validated route param. Express 5 types params loosely
 * (`string | string[] | undefined`); the Joi `params` schema upstream has
 * already enforced the UUID format, so this narrows to a plain string and
 * treats anything else as a bad request (defensive, unreachable in practice).
 */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string") {
    throw AppError.badRequest(`Route parameter ${name} is invalid`);
  }
  return value;
}
