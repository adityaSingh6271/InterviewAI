import { apiFetch } from "./client";
import type { ApiResult } from "./types";
import type { ResumeReference } from "@/lib/types/jobInterview";

/**
 * Resume extraction API. The upload goes as multipart FormData; the server
 * parses the file and answers with extracted data only (text + metadata) -
 * raw bytes never round-trip into JSON payloads.
 */

/** Mirror of server/src/constants/resume.constants.ts (Joi enforces it too). */
export const RESUME_TEXT_MAX = 50_000;

export const resumesApi = {
  /** POST /resumes - 200 with extracted text, 422 for bad/oversized files. */
  extract(file: File): Promise<ApiResult<ResumeReference>> {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<ResumeReference>("/resumes", { method: "POST", body: form });
  },
};
