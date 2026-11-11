import type { Response } from "express";

/**
 * Consistent API response envelope (PDF 8):
 *
 *   success: { success: true,  data, meta? }
 *   failure: { success: false, error: { code, message, details: [] } }
 *
 * Every JSON response in the API goes through these two helpers.
 */

export type ErrorDetail = { field?: string; message: string };

export type ErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details: ErrorDetail[];
  };
};

export type SuccessBody<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

/** Send a success envelope. */
export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  data: T,
  meta?: Record<string, unknown>,
): void {
  const body: SuccessBody<T> = { success: true, data };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
}

/** Send a failure envelope with a stable error code and field-level details. */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details: ErrorDetail[] = [],
): void {
  const body: ErrorBody = { success: false, error: { code, message, details } };
  res.status(statusCode).json(body);
}
