import { apiFetch } from "./client";
import { SERVER_INTERVIEW_STATUSES, type ServerInterviewStatus } from "./interviews";
import type { ApiResult, User } from "./types";

/**
 * Admin-portal API surface: dashboard stats + the resources the admin panel
 * manages (admin accounts, institutes, students, organizations, LLM configs,
 * applications, attempts).
 *
 * Types mirror server/src/types/entities.types.ts and the Joi schemas in
 * server/src/validations/* - the server is the source of truth for enum
 * values, sort allowlists, and field caps. Every list endpoint answers the
 * standard `{ data, meta: { total, page, limit, totalPages } }` envelope.
 */

// ---- Enum mirrors (server canonical values) ------------------------------

export const ADMIN_ROLES = ["SUPER_ADMIN", "ORG_ADMIN", "INSTITUTE_ADMIN"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const APPLICATION_STATUSES = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEWED",
  "REJECTED",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const ATTEMPT_STATUSES = ["IN_PROGRESS", "COMPLETED", "EVALUATED"] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

// ---- Response shapes ------------------------------------------------------

/**
 * GET /admin/stats payload (adminService.AdminStats). Counters are scoped to
 * the institutes the acting admin may see; every status key is always present
 * (missing counts are filled with 0 server-side).
 */
export interface AdminStats {
  totalAdmins: number;
  totalStudents: number;
  totalInstitutes: number;
  interviews: Record<ServerInterviewStatus, number>;
  applications: Record<ApplicationStatus, number>;
  attempts: Record<AttemptStatus, number>;
  generatedAt: string;
}

/** Admin account rows are admin-portal identities (`adminRole` always set). */
export type AdminAccount = User;
/** Student rows are student-portal identities. */
export type StudentAccount = User;

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** API key is write-only - accepted on create/update, never returned. */
export interface LlmConfig {
  id: string;
  organizationId: string;
  provider: string;
  modelName: string;
  settings: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Institute {
  id: string;
  organizationId: string;
  name: string;
  /** Invite code students enter at self-registration. */
  joinCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerStudentApplication {
  id: string;
  interviewId: string;
  studentId: string;
  resumeFileUrl: string | null;
  resumeText: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
}

export interface ServerRoundAttempt {
  id: string;
  roundId: string;
  studentId: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  aiScore: number | null;
  aiFeedback: string | null;
}

// ---- List params ----------------------------------------------------------

/** Standard list query (server `listQuery`): page/limit/order + free-text q. */
export interface BaseListParams {
  page?: number;
  limit?: number;
  order?: "asc" | "desc";
  /** Server-side ILIKE search (ignored by endpoints without a search column). */
  q?: string;
}

/** Sort fields exactly as the server allowlists them per resource. */
export interface AdminListParams extends BaseListParams {
  sort?: "createdAt" | "name" | "email" | "role";
  instituteId?: string;
}

export interface InstituteListParams extends BaseListParams {
  sort?: "createdAt" | "name";
  organizationId?: string;
}

export interface StudentListParams extends BaseListParams {
  sort?: "createdAt" | "name" | "email";
  instituteId?: string;
}

export interface OrganizationListParams extends BaseListParams {
  sort?: "createdAt" | "name";
}

export interface LlmConfigListParams extends BaseListParams {
  sort?: "createdAt" | "provider" | "modelName";
}

export interface ApplicationListParams extends BaseListParams {
  sort?: "appliedAt" | "status" | "createdAt";
  status?: ApplicationStatus;
  interviewId?: string;
  studentId?: string;
}

export interface AttemptListParams extends BaseListParams {
  sort?: "startedAt" | "createdAt" | "status";
  status?: AttemptStatus;
  roundId?: string;
  interviewId?: string;
  studentId?: string;
}

export interface InterviewListParams extends BaseListParams {
  sort?: "createdAt" | "title" | "status";
  status?: ServerInterviewStatus;
  instituteId?: string;
}

// ---- Request payloads -----------------------------------------------------

/** Payload types (not interfaces) so they carry an implicit index signature
 *  for the fetch wrapper's `Record<string, unknown>` body. */

export type CreateAdminPayload = {
  name: string;
  email: string;
  /** min 8, max 72 (server Joi). */
  password: string;
  role?: AdminRole;
  /** Target institute - only honoured for admins above INSTITUTE_ADMIN. */
  instituteId?: string;
};

export type UpdateAdminPayload = Partial<{
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  instituteId: string;
}>;

export type CreateInstitutePayload = {
  name: string;
  /** Optional - the service generates an alphanumeric code when absent. */
  joinCode?: string;
  /** SUPER_ADMIN only (service rank-checks). */
  organizationId?: string;
};

export type UpdateInstitutePayload = Partial<{
  name: string;
  joinCode: string;
  organizationId: string;
}>;

export type CreateStudentPayload = {
  name: string;
  email: string;
  password: string;
  /** Defaults to the acting admin's institute server-side. */
  instituteId?: string;
};

export type UpdateStudentPayload = Partial<{
  name: string;
  email: string;
  password: string;
  instituteId: string;
}>;

export type CreateOrganizationPayload = { name: string };
export type UpdateOrganizationPayload = { name: string };

export type CreateLlmConfigPayload = {
  provider: string;
  modelName: string;
  /** min 8, max 512 - write-only, encrypted at rest, never returned. */
  apiKey: string;
  settings?: Record<string, unknown> | null;
  isActive?: boolean;
};

export type UpdateLlmConfigPayload = Partial<{
  provider: string;
  modelName: string;
  apiKey: string;
  settings: Record<string, unknown> | null;
  isActive: boolean;
}>;

// ---- API object -----------------------------------------------------------

export const adminApi = {
  // ---- Dashboard ----------------------------------------------------------

  /** 200. Institute-scoped dashboard counters (admin portal only). */
  stats(): Promise<ApiResult<AdminStats>> {
    return apiFetch<AdminStats>("/admin/stats");
  },

  // ---- Admin accounts (/admins) ------------------------------------------

  listAdmins(params: AdminListParams = {}): Promise<ApiResult<User[]>> {
    return apiFetch<User[]>("/admins", { query: { ...params } });
  },

  getAdmin(id: string): Promise<ApiResult<User>> {
    return apiFetch<User>(`/admins/${id}`);
  },

  /** 201. Provisioned by a higher-rank admin (rank checks server-side). */
  createAdmin(payload: CreateAdminPayload): Promise<ApiResult<User>> {
    return apiFetch<User>("/admins", { method: "POST", body: payload });
  },

  updateAdmin(id: string, payload: UpdateAdminPayload): Promise<ApiResult<User>> {
    return apiFetch<User>(`/admins/${id}`, { method: "PATCH", body: payload });
  },

  /** 204. */
  deleteAdmin(id: string): Promise<ApiResult<void>> {
    return apiFetch<void>(`/admins/${id}`, { method: "DELETE" });
  },

  // ---- Institutes (/institutes) ------------------------------------------

  listInstitutes(params: InstituteListParams = {}): Promise<ApiResult<Institute[]>> {
    return apiFetch<Institute[]>("/institutes", { query: { ...params } });
  },

  getInstitute(id: string): Promise<ApiResult<Institute>> {
    return apiFetch<Institute>(`/institutes/${id}`);
  },

  createInstitute(payload: CreateInstitutePayload): Promise<ApiResult<Institute>> {
    return apiFetch<Institute>("/institutes", { method: "POST", body: payload });
  },

  updateInstitute(id: string, payload: UpdateInstitutePayload): Promise<ApiResult<Institute>> {
    return apiFetch<Institute>(`/institutes/${id}`, { method: "PATCH", body: payload });
  },

  /** 204. */
  deleteInstitute(id: string): Promise<ApiResult<void>> {
    return apiFetch<void>(`/institutes/${id}`, { method: "DELETE" });
  },

  // ---- Students (/students) ----------------------------------------------

  listStudents(params: StudentListParams = {}): Promise<ApiResult<User[]>> {
    return apiFetch<User[]>("/students", { query: { ...params } });
  },

  getStudent(id: string): Promise<ApiResult<User>> {
    return apiFetch<User>(`/students/${id}`);
  },

  createStudent(payload: CreateStudentPayload): Promise<ApiResult<User>> {
    return apiFetch<User>("/students", { method: "POST", body: payload });
  },

  updateStudent(id: string, payload: UpdateStudentPayload): Promise<ApiResult<User>> {
    return apiFetch<User>(`/students/${id}`, { method: "PATCH", body: payload });
  },

  /** 204. */
  deleteStudent(id: string): Promise<ApiResult<void>> {
    return apiFetch<void>(`/students/${id}`, { method: "DELETE" });
  },

  listStudentApplications(
    studentId: string,
    params: ApplicationListParams = {},
  ): Promise<ApiResult<ServerStudentApplication[]>> {
    return apiFetch<ServerStudentApplication[]>(`/students/${studentId}/applications`, {
      query: { ...params },
    });
  },

  listStudentAttempts(
    studentId: string,
    params: AttemptListParams = {},
  ): Promise<ApiResult<ServerRoundAttempt[]>> {
    return apiFetch<ServerRoundAttempt[]>(`/students/${studentId}/attempts`, {
      query: { ...params },
    });
  },

  // ---- Organizations + LLM configs (/organizations) -----------------------
  // SUPER_ADMIN-only end to end (the router enforces the role gate).

  listOrganizations(params: OrganizationListParams = {}): Promise<ApiResult<Organization[]>> {
    return apiFetch<Organization[]>("/organizations", { query: { ...params } });
  },

  getOrganization(id: string): Promise<ApiResult<Organization>> {
    return apiFetch<Organization>(`/organizations/${id}`);
  },

  createOrganization(payload: CreateOrganizationPayload): Promise<ApiResult<Organization>> {
    return apiFetch<Organization>("/organizations", { method: "POST", body: payload });
  },

  updateOrganization(id: string, payload: UpdateOrganizationPayload): Promise<ApiResult<Organization>> {
    return apiFetch<Organization>(`/organizations/${id}`, { method: "PATCH", body: payload });
  },

  /** 204. */
  deleteOrganization(id: string): Promise<ApiResult<void>> {
    return apiFetch<void>(`/organizations/${id}`, { method: "DELETE" });
  },

  listLlmConfigs(
    organizationId: string,
    params: LlmConfigListParams = {},
  ): Promise<ApiResult<LlmConfig[]>> {
    return apiFetch<LlmConfig[]>(`/organizations/${organizationId}/llm-configs`, {
      query: { ...params },
    });
  },

  /** 200. Get single LLM config (omits apiKey). */
  getLlmConfig(
    organizationId: string,
    llmConfigId: string,
  ): Promise<ApiResult<LlmConfig>> {
    return apiFetch<LlmConfig>(
      `/organizations/${organizationId}/llm-configs/${llmConfigId}`,
    );
  },

  /** 201. The apiKey never comes back on any read. */
  createLlmConfig(
    organizationId: string,
    payload: CreateLlmConfigPayload,
  ): Promise<ApiResult<LlmConfig>> {
    return apiFetch<LlmConfig>(`/organizations/${organizationId}/llm-configs`, {
      method: "POST",
      body: payload,
    });
  },

  updateLlmConfig(
    organizationId: string,
    llmConfigId: string,
    payload: UpdateLlmConfigPayload,
  ): Promise<ApiResult<LlmConfig>> {
    return apiFetch<LlmConfig>(
      `/organizations/${organizationId}/llm-configs/${llmConfigId}`,
      { method: "PATCH", body: payload },
    );
  },

  /** 204. */
  deleteLlmConfig(organizationId: string, llmConfigId: string): Promise<ApiResult<void>> {
    return apiFetch<void>(
      `/organizations/${organizationId}/llm-configs/${llmConfigId}`,
      { method: "DELETE" },
    );
  },

  // ---- Applications (/student-applications) -------------------------------

  /** 200. Admin pipeline view across the acting admin's scope. */
  listApplications(params: ApplicationListParams = {}): Promise<ApiResult<ServerStudentApplication[]>> {
    return apiFetch<ServerStudentApplication[]>("/student-applications", {
      query: { ...params },
    });
  },

  getApplication(id: string): Promise<ApiResult<ServerStudentApplication>> {
    return apiFetch<ServerStudentApplication>(`/student-applications/${id}`);
  },

  /** 200. Admin-only pipeline status transition. */
  updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<ApiResult<ServerStudentApplication>> {
    return apiFetch<ServerStudentApplication>(`/student-applications/${id}`, {
      method: "PATCH",
      body: { status },
    });
  },

  /** 204. Withdraw/remove (student own row or admin in scope). */
  deleteApplication(id: string): Promise<ApiResult<void>> {
    return apiFetch<void>(`/student-applications/${id}`, { method: "DELETE" });
  },

  // ---- Attempts (/round-attempts) ----------------------------------------

  /** 200. Admin: scope-filtered; the `q` param is ignored server-side. */
  listAttempts(params: AttemptListParams = {}): Promise<ApiResult<ServerRoundAttempt[]>> {
    return apiFetch<ServerRoundAttempt[]>("/round-attempts", { query: { ...params } });
  },

  getAttempt(id: string): Promise<ApiResult<ServerRoundAttempt>> {
    return apiFetch<ServerRoundAttempt>(`/round-attempts/${id}`);
  },

  /** 200. Move a submitted attempt on to EVALUATED (admin). */
  updateAttemptStatus(
    id: string,
    status: Extract<AttemptStatus, "COMPLETED" | "EVALUATED">,
  ): Promise<ApiResult<ServerRoundAttempt>> {
    return apiFetch<ServerRoundAttempt>(`/round-attempts/${id}`, {
      method: "PATCH",
      body: { status },
    });
  },

  /** 204. Admin-only delete. */
  deleteAttempt(id: string): Promise<ApiResult<void>> {
    return apiFetch<void>(`/round-attempts/${id}`, { method: "DELETE" });
  },

  /**
   * 200. Admin AI re-score of a submitted attempt (idempotent re-run, rate
   * limited server-side). Rejects while the attempt is IN_PROGRESS.
   */
  evaluateAttempt(id: string): Promise<ApiResult<unknown, Record<string, unknown>>> {
    return apiFetch<unknown, Record<string, unknown>>(`/round-attempts/${id}/evaluate`, {
      method: "POST",
    });
  },

  // ---- Nested reads (detail panels) --------------------------------------

  /** 200. Applications of one interview (admin/owner scope server-side). */
  listInterviewApplications(
    interviewId: string,
    params: ApplicationListParams = {},
  ): Promise<ApiResult<ServerStudentApplication[]>> {
    return apiFetch<ServerStudentApplication[]>(`/interviews/${interviewId}/applications`, {
      query: { ...params },
    });
  },
};

/** Re-exported so list pages share one status vocabulary. */
export { SERVER_INTERVIEW_STATUSES };
export type { ServerInterviewStatus };
