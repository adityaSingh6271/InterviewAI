import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error.util";

/**
 * Any unmatched path becomes a 404 rendered as the standard error envelope
 * (PDF 8: 404 handler for unmatched routes). Query strings are stripped so
 * tokens in a URL never end up in logs or responses.
 */
export const notFound: RequestHandler = (req, _res, next) => {
  const path = req.originalUrl.split("?")[0];
  next(AppError.notFound(`Route not found: ${req.method} ${path}`));
};
