/**
 * Types mirroring the Express API contract (server/src/utils/response.util.ts,
 * server/src/types/auth.types.ts, server/src/types/entities.types.ts).
 *
 * Every response uses the envelope:
 *   success: { success: true,  data, meta? }
 *   failure: { success: false, error: { code, message, details? } }
 */

/** Which portal an identity belongs to (two-portal auth model). */
export type Portal = "student" | "admin";

export interface AccessControl {
  role: "STUDENT" | "INSTITUTE_ADMIN" | "ORG_ADMIN" | "SUPER_ADMIN" | "ANONYMOUS";
  rank: number;
  portal: Portal | null;
  instituteId: string | null;
  scope: "GLOBAL" | "ORGANIZATION" | "INSTITUTE" | "STUDENT" | "NONE";
  permissions: string[];
  canManageOrganizations: boolean;
  canManageAllInstitutes: boolean;
  canManageStudents: boolean;
  canManageInterviews: boolean;
  canManageAdmins: boolean;
}

/** Public user shape returned by register/login/refresh/me. */
export interface User {
  id: string;
  portal: Portal;
  name: string;
  email: string;
  instituteId: string;
  /** Admin portal only. */
  adminRole?: string;
  /** Explicit RBAC and capability metadata. */
  accessControl?: AccessControl;
  createdAt: string;
  updatedAt: string;
}

/** Auth endpoints return the public user plus access token and optional refreshToken. */
export interface AuthSession {
  user: User;
  accessControl?: AccessControl;
  accessToken: string;
  refreshToken?: string;
}


/** Field-level detail on a failed validation (422). */
export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/** Error payload of the response envelope. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

/** Meta object attached to paginated list responses. */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Full JSON body of any API response. */
export type ApiEnvelope<T> =
  | { success: true; data: T; meta?: PaginationMeta }
  | { success: false; error: ApiErrorBody };

/** What `apiFetch` resolves to: the unwrapped data plus optional pagination meta. */
export interface ApiResult<T, M = PaginationMeta> {
  data: T;
  meta?: M;
}
