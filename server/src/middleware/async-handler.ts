import type { RequestHandler } from "express";

/**
 * Wraps an async route handler so a rejected promise reaches the error
 * middleware instead of hanging the request. Express 5 handles sync throws
 * already; use this for handlers where you catch-and-maybe-rethrow yourself.
 *
 *   router.get("/", asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
