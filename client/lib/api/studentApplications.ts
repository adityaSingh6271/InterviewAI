import { apiFetch } from "./client";
import type { ApiResult } from "./types";
import type { ServerRoundAttempt, ServerStudentApplication } from "./admin";

export type CreateApplicationPayload = {
  interviewId: string;
  resumeFileUrl?: string | null;
  resumeText?: string | null;
};

export type ApplicationListParams = {
  page?: number;
  limit?: number;
  status?: string;
  order?: "asc" | "desc";
};

/**
 * Student Application API (PDF 8 + 11).
 * Allows student candidates to submit, view, and withdraw applications,
 * as well as inspect their own application and round attempt histories.
 */
export const studentApplicationsApi = {
  /** 201. Student submits an application to an active interview. */
  apply(payload: CreateApplicationPayload): Promise<ApiResult<ServerStudentApplication>> {
    return apiFetch<ServerStudentApplication>("/student-applications", {
      method: "POST",
      body: payload,
    });
  },

  /** 200. Inspect single application details. */
  get(applicationId: string): Promise<ApiResult<ServerStudentApplication>> {
    return apiFetch<ServerStudentApplication>(`/student-applications/${applicationId}`);
  },

  /** 204. Student withdraws an active application. */
  withdraw(applicationId: string): Promise<ApiResult<void>> {
    return apiFetch<void>(`/student-applications/${applicationId}`, {
      method: "DELETE",
    });
  },

  /** 200. Fetch all applications submitted by a specific student. */
  listByStudent(
    studentId: string,
    params: ApplicationListParams = {},
  ): Promise<ApiResult<ServerStudentApplication[]>> {
    return apiFetch<ServerStudentApplication[]>(`/students/${studentId}/applications`, {
      query: { ...params },
    });
  },

  /** 200. Fetch all attempts made across all interviews by a specific student. */
  listMyAttempts(
    studentId: string,
    params: { page?: number; limit?: number; status?: string } = {},
  ): Promise<ApiResult<ServerRoundAttempt[]>> {
    return apiFetch<ServerRoundAttempt[]>(`/students/${studentId}/attempts`, {
      query: { ...params },
    });
  },
};
