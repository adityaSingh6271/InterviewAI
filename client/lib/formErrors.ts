import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "@/lib/api/errors";

/**
 * Map a failed API write onto a react-hook-form: every 422 `details[].field`
 * becomes an inline field error (field names match the server Joi schema,
 * which matches the Zod form names). Non-validation failures are left to the
 * caller (`getErrorMessage`) for a toast/form-level message.
 */
export function applyApiFormError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): void {
  if (!isApiError(error)) return;
  for (const detail of error.details) {
    if (detail.field) {
      setError(detail.field as Path<T>, { type: "server", message: detail.message });
    }
  }
}
