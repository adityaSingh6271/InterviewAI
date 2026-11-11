import type { AuthUser } from "../types/auth.types";
import { AppError } from "./app-error.util";

/**
 * Tenancy and role guards used by the service layer (Standards PDF 11:
 * RBAC + resource ownership checks server-side, deny by default).
 *
 * Two rules decide every access question:
 * - portal: admin rows are managed by admins, student rows only by their
 *   owner (or an admin of the same institute);
 * - institute scope: everything below an institute is invisible outside it.
 *   Out-of-scope resources answer **404, never 403**, so a caller cannot
 *   probe for the existence of another tenant's rows (Standards PDF 11:
 *   "403 vs 404 decisions consistent (avoid leaking existence)").
 */

/** Role precedence for admin-on-admin operations (higher = more powerful). */
export const ROLE_RANK = {
  SUPER_ADMIN: 3,
  ORG_ADMIN: 2,
  INSTITUTE_ADMIN: 1,
} as const;

export type UserAccessControl = {
  role: "STUDENT" | "INSTITUTE_ADMIN" | "ORG_ADMIN" | "SUPER_ADMIN";
  rank: number;
  portal: "student" | "admin";
  instituteId: string;
  scope: "GLOBAL" | "ORGANIZATION" | "INSTITUTE" | "STUDENT";
  permissions: string[];
  canManageOrganizations: boolean;
  canManageAllInstitutes: boolean;
  canManageStudents: boolean;
  canManageInterviews: boolean;
  canManageAdmins: boolean;
};

export function resolveAccessControl(user: AuthUser): UserAccessControl {
  if (user.portal === "student") {
    return {
      role: "STUDENT",
      rank: 0,
      portal: "student",
      instituteId: user.instituteId,
      scope: "STUDENT",
      permissions: [
        "interviews:attempt",
        "interviews:view_own",
        "feedback:view_own",
        "profile:manage_own",
      ],
      canManageOrganizations: false,
      canManageAllInstitutes: false,
      canManageStudents: false,
      canManageInterviews: false,
      canManageAdmins: false,
    };
  }

  const role = user.adminRole ?? "INSTITUTE_ADMIN";

  if (role === "SUPER_ADMIN") {
    return {
      role: "SUPER_ADMIN",
      rank: 3,
      portal: "admin",
      instituteId: user.instituteId,
      scope: "GLOBAL",
      permissions: [
        "organizations:manage",
        "llm_configs:manage",
        "institutes:manage_all",
        "students:manage_all",
        "interviews:manage_all",
        "admins:manage_all",
        "metrics:view_global",
      ],
      canManageOrganizations: true,
      canManageAllInstitutes: true,
      canManageStudents: true,
      canManageInterviews: true,
      canManageAdmins: true,
    };
  }

  if (role === "ORG_ADMIN") {
    return {
      role: "ORG_ADMIN",
      rank: 2,
      portal: "admin",
      instituteId: user.instituteId,
      scope: "ORGANIZATION",
      permissions: [
        "institutes:manage_org",
        "students:manage_org",
        "interviews:manage_org",
        "admins:manage_org",
        "metrics:view_org",
      ],
      canManageOrganizations: false,
      canManageAllInstitutes: false,
      canManageStudents: true,
      canManageInterviews: true,
      canManageAdmins: true,
    };
  }

  // INSTITUTE_ADMIN
  return {
    role: "INSTITUTE_ADMIN",
    rank: 1,
    portal: "admin",
    instituteId: user.instituteId,
    scope: "INSTITUTE",
    permissions: [
      "students:manage_institute",
      "interviews:manage_institute",
      "admins:manage_institute",
      "metrics:view_institute",
    ],
    canManageOrganizations: false,
    canManageAllInstitutes: false,
    canManageStudents: true,
    canManageInterviews: true,
    canManageAdmins: true,
  };
}

/** 0 for students / unknown roles. */
export function adminRoleRank(actor: AuthUser): number {
  return (actor.adminRole ? ROLE_RANK[actor.adminRole] : 0) ?? 0;
}

/** 403 unless the actor is an admin (portal guard for service-level checks). */
export function requireAdmin(actor: AuthUser): asserts actor is AuthUser & {
  portal: "admin";
  adminRole: NonNullable<AuthUser["adminRole"]>;
} {
  if (actor.portal !== "admin" || !actor.adminRole) {
    throw AppError.forbidden("Only admin accounts can perform this action");
  }
}

/** 403 unless the actor's admin role rank is at least `minRank`. */
export function requireRoleRank(actor: AuthUser, minRank: number): void {
  requireAdmin(actor);
  if (adminRoleRank(actor) < minRank) {
    throw AppError.forbidden("Your role cannot perform this action");
  }
}

/** May the actor see institute-scoped resources of `instituteId`? */
export function canAccessInstitute(actor: AuthUser, instituteId: string): boolean {
  if (actor.portal === "admin") {
    return actor.adminRole === "SUPER_ADMIN" || actor.instituteId === instituteId;
  }
  return actor.instituteId === instituteId;
}

/** Institute-scope guard - out of scope is reported as 404. */
export function requireInstituteAccess(actor: AuthUser, instituteId: string): void {
  if (!canAccessInstitute(actor, instituteId)) {
    throw AppError.notFound("Resource not found");
  }
}

/**
 * Student-owned rows: the owning student (matched by id) or an admin of the
 * student's institute. Anyone else gets 404.
 */
export function requireOwnerOrInstitute(
  actor: AuthUser,
  studentId: string,
  instituteId: string,
): void {
  if (actor.portal === "student") {
    if (actor.id !== studentId) {
      throw AppError.notFound("Resource not found");
    }
    return;
  }
  requireInstituteAccess(actor, instituteId);
}
