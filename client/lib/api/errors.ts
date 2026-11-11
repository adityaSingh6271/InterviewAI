import type { ApiErrorDetail, ApiErrorBody } from "./types";

/**
 * Error thrown by the API client for any non-success response (HTTP error or
 * `success: false` envelope). Carries the stable server error `code` so UI can
 * branch on it, plus field-level details for validation failures.
 */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = body.code;
    this.details = body.details ?? [];
  }

  /** Validation message for a specific field, if the server sent one. */
  fieldError(field: string): string | undefined {
    return this.details.find((d) => d.field === field)?.message;
  }
}

/** True when the error is an ApiRequestError (portable across realms). */
export function isApiError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

/**
 * A user-facing message for any thrown error. Server messages for known
 * failures are trusted; anything else falls back to the given fallback text
 * (never leaks stack traces or internals).
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error) && error.message) return error.message;
  if (error instanceof TypeError) {
    // fetch() rejects with TypeError on network failure
    return "Unable to reach the server. Please check your connection and try again.";
  }
  return fallback;
}
