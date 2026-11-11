import { isApiError } from "@/lib/api";

/**
 * User-facing copy for the stable auth error codes returned by
 * server/src/constants/error-codes.ts. Anything unmapped falls back to a
 * generic message (never leaks server internals).
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Invalid email or password. Please check your credentials and try again.",
  ACCOUNT_LOCKED:
    "Your account has been temporarily locked after too many failed attempts. Please try again in a few minutes.",
  RATE_LIMITED: "Too many attempts. Please wait a moment before trying again.",
  VALIDATION_ERROR: "Please correct the highlighted fields and try again.",
  CONFLICT: "An account with this email already exists. Try signing in instead.",
  SERVICE_NOT_READY:
    "The service is temporarily unavailable. Please try again in a moment.",
  ORIGIN_REQUIRED: "This request was blocked. Please refresh the page and try again.",
};

/** Map any thrown auth error to a safe, user-friendly message. */
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    return AUTH_ERROR_MESSAGES[error.code] ?? fallback;
  }
  if (error instanceof TypeError) {
    return "Unable to reach the server. Please check your connection and try again.";
  }
  return fallback;
}
