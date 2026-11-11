/**
 * Shared resume limits (Standards PDF 0: shared constants live in /constants).
 * Used by the multipart upload middleware, the Joi request schemas, and the
 * extraction service so the three cannot drift apart.
 */

/** Max extracted text kept in `Interview.resume.content` (chars). */
export const RESUME_TEXT_MAX = 50_000;

/** Max uploaded file size (bytes) - matches the wizard's advertised 10MB. */
export const RESUME_FILE_MAX_BYTES = 10 * 1024 * 1024;

/** Accepted upload types: extension -> allowed MIME types.
 *  (Legacy .doc is excluded on purpose - no parser here reads it.) */
export const RESUME_ACCEPTED_TYPES: Readonly<Record<string, readonly string[]>> = {
  ".pdf": ["application/pdf"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream", // some browsers send no specific type
  ],
  ".txt": ["text/plain"],
};
