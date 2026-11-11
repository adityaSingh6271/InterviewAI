import { apiFetch } from "./client";
import type { ApiResult } from "./types";

/**
 * Round-attempt API (the student simulation flow). Types mirror
 * server/src/types/entities.types.ts - the server is the source of truth
 * for enum values (see server/src/validations/attempt.validation.ts).
 */

// ---- Enum mirrors (server canonical values) ------------------------------

export const SERVER_ATTEMPT_STATUSES = [
  "IN_PROGRESS",
  "COMPLETED",
  "EVALUATED",
] as const;
export type ServerAttemptStatus = (typeof SERVER_ATTEMPT_STATUSES)[number];

// ---- Response shapes ------------------------------------------------------

export interface ServerAttempt {
  id: string;
  roundId: string;
  studentId: string;
  attemptNumber: number;
  status: ServerAttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Aggregate of the attempt's response scores (null until AI evaluation lands). */
  aiScore: number | null;
  /** Examiner feedback from the attempt's strongest scored response. */
  aiFeedback: string | null;
}

export interface ServerResponse {
  id: string;
  roundAttemptId: string;
  questionId: string;
  transcript: string | null;
  aiScore: number | null;
  aiFeedback: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Inline AI evaluation verdict attached to a student submit as meta. */
export interface AttemptEvaluationMeta {
  evaluation: "evaluated" | "partial" | "skipped";
  failed: number;
  reason?: string;
}

// ---- API object -----------------------------------------------------------

export const attemptsApi = {
  /** 201 start (student only; the round's interview must be ACTIVE). */
  start(roundId: string): Promise<ApiResult<ServerAttempt>> {
    return apiFetch<ServerAttempt>("/round-attempts", {
      method: "POST",
      body: { roundId },
    });
  },

  /**
   * Paginated attempts for the signed-in student (or scoped institute for admins).
   */
  list(
    params: { page?: number; limit?: number; interviewId?: string; status?: ServerAttemptStatus } = {},
  ): Promise<ApiResult<ServerAttempt[]>> {
    return apiFetch<ServerAttempt[]>("/round-attempts", {
      query: { ...params },
    });
  },

  /**
   * Paginated attempts for one interview. Students receive only their own
   * rows (pinned server-side); admins may filter further.
   */
  listByInterview(
    interviewId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<ApiResult<ServerAttempt[]>> {
    return apiFetch<ServerAttempt[]>("/round-attempts", {
      query: { interviewId, ...params },
    });
  },

  /** Responses of one attempt (owner student or admin). */
  listResponses(
    attemptId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<ApiResult<ServerResponse[]>> {
    return apiFetch<ServerResponse[]>(`/round-attempts/${attemptId}/responses`, {
      query: { ...params },
    });
  },

  /** 201 submit one answer (student, while the attempt is IN_PROGRESS). */
  createResponse(
    attemptId: string,
    payload: { questionId: string; transcript?: string },
  ): Promise<ApiResult<ServerResponse>> {
    return apiFetch<ServerResponse>(`/round-attempts/${attemptId}/responses`, {
      method: "POST",
      body: payload,
    });
  },

  /** 200 transcribe a recorded spoken answer clip via Whisper. */
  transcribeAudio(
    attemptId: string,
    audioBlob: Blob,
  ): Promise<ApiResult<{ transcript: string }>> {
    const ext = audioBlob.type.includes("ogg")
      ? "ogg"
      : audioBlob.type.includes("mp4")
        ? "m4a"
        : audioBlob.type.includes("wav")
          ? "wav"
          : "webm";
    const formData = new FormData();
    formData.append("file", audioBlob, `answer.${ext}`);
    return apiFetch<{ transcript: string }>(`/round-attempts/${attemptId}/transcribe`, {
      method: "POST",
      body: formData,
    });
  },

  /**
   * Submit (student): IN_PROGRESS -> COMPLETED, once. The server runs
   * inline AI evaluation and reports the verdict as meta
   * (`evaluation: evaluated|partial|skipped`, `failed: n`).
   */
  submit(id: string): Promise<ApiResult<ServerAttempt, AttemptEvaluationMeta>> {
    return apiFetch<ServerAttempt, AttemptEvaluationMeta>(`/round-attempts/${id}`, {
      method: "PATCH",
      body: { status: "COMPLETED" },
    });
  },

  // ---- Individual response operations --------------------------------------

  /** 200. Inspect individual question response / transcript. */
  getResponse(responseId: string): Promise<ApiResult<ServerResponse>> {
    return apiFetch<ServerResponse>(`/responses/${responseId}`);
  },

  /** 200. Update transcript (student while in progress) or manual grading (admin). */
  updateResponse(
    responseId: string,
    payload: { transcript?: string; aiScore?: number; aiFeedback?: string },
  ): Promise<ApiResult<ServerResponse>> {
    return apiFetch<ServerResponse>(`/responses/${responseId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  /** 200. Isolated AI re-evaluation for a single response (admin). */
  evaluateResponse(responseId: string): Promise<ApiResult<ServerResponse>> {
    return apiFetch<ServerResponse>(`/responses/${responseId}/evaluate`, {
      method: "POST",
    });
  },

  /** 204. Remove student response. */
  removeResponse(responseId: string): Promise<ApiResult<void>> {
    return apiFetch<void>(`/responses/${responseId}`, { method: "DELETE" });
  },
};
