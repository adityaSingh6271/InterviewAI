import { randomUUID } from "node:crypto";
import { adminRepository } from "../repositories/admin.repository";
import { instituteRepository } from "../repositories/institute.repository";
import type { AuthUser } from "../types/auth.types";
import type { ListParams, Paginated } from "../types/entities.types";
import { AppError } from "../utils/app-error.util";
import { hashPassword } from "../utils/auth.util";
import {
  adminRoleRank,
  requireAdmin,
  requireInstituteAccess,
  requireRoleRank,
  ROLE_RANK,
} from "../utils/scope.util";

export type AdminStats = {
  totalAdmins: number;
  totalStudents: number;
  totalInstitutes: number;
  /** Interview/application/attempt counters keyed by status (missing = 0). */
  interviews: Record<"DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED", number>;
  applications: Record<"APPLIED" | "SHORTLISTED" | "INTERVIEWED" | "REJECTED", number>;
  attempts: Record<"IN_PROGRESS" | "COMPLETED" | "EVALUATED", number>;
  generatedAt: string;
};

/**
 * Admin service (PDF 13: business logic, framework-agnostic, no req/res).
 *
 * Two halves:
 * - dashboard statistics behind `authorize("admin")` at the route;
 * - admin account CRUD, where every write is rank-checked so no admin can
 *   mint or modify an account above their own role (privilege escalation is
 *   decided server-side, never by a client-supplied `role`):
 *
 *     assign role   -> actorRank >= targetRoleRank
 *     edit/delete   -> actorRank >= target's current rank, never self-delete
 *     target tenant -> same institute (any institute for SUPER_ADMIN)
 *
 * Password changes revoke the target's refresh token (session invalidation
 * on password change, Standards PDF 10).
 */

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: unknown }).code === "23505";
}

/** Fill every known status with 0 so the stats contract has stable keys. */
function zeroFill<K extends string>(
  counts: Record<string, number>,
  keys: readonly K[],
): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, counts[key] ?? 0])) as Record<K, number>;
}

/** Institute the new account belongs to, checked against the actor's power. */
async function resolveTargetInstitute(
  actor: AuthUser,
  requestedInstituteId: string | undefined,
): Promise<string> {
  requireAdmin(actor);
  const target = requestedInstituteId ?? actor.instituteId;
  if (actor.adminRole === "SUPER_ADMIN") {
    const exists = await instituteRepository.findById(target);
    if (!exists) throw AppError.notFound("Institute not found");
    return target;
  }
  if (actor.adminRole === "ORG_ADMIN") {
    const ownOrganizationId = await instituteRepository.findOrganizationId(actor.instituteId);
    const targetOrganizationId = await instituteRepository.findOrganizationId(target);
    if (!ownOrganizationId || ownOrganizationId !== targetOrganizationId) {
      throw AppError.forbidden("instituteId is outside your organization");
    }
    return target;
  }
  if (target !== actor.instituteId) {
    throw AppError.forbidden("instituteId is outside your scope");
  }
  return target;
}

export const adminService = {
  /**
   * Dashboard counters scoped to the institutes this admin may see:
   * SUPER_ADMIN sees the whole platform, ORG_ADMIN its organization's
   * institutes, INSTITUTE_ADMIN its own institute (Standards PDF 11 - the
   * scope is derived server-side from the token, never from the client).
   */
  async stats(actor: AuthUser): Promise<AdminStats> {
    requireAdmin(actor);
    let instituteIds: string[] | null;
    if (actor.adminRole === "SUPER_ADMIN") {
      instituteIds = null; // no tenant filter
    } else if (actor.adminRole === "ORG_ADMIN") {
      const organizationId = await instituteRepository.findOrganizationId(actor.instituteId);
      instituteIds = organizationId
        ? await instituteRepository.listIdsByOrganization(organizationId)
        : [];
    } else {
      instituteIds = [actor.instituteId];
    }

    const raw = await adminRepository.dashboardStats({ instituteIds });
    return {
      totalAdmins: raw.totalAdmins,
      totalStudents: raw.totalStudents,
      totalInstitutes: raw.totalInstitutes,
      interviews: zeroFill(raw.interviewsByStatus, [
        "DRAFT",
        "ACTIVE",
        "COMPLETED",
        "ARCHIVED",
      ]),
      applications: zeroFill(raw.applicationsByStatus, [
        "APPLIED",
        "SHORTLISTED",
        "INTERVIEWED",
        "REJECTED",
      ]),
      attempts: zeroFill(raw.attemptsByStatus, [
        "IN_PROGRESS",
        "COMPLETED",
        "EVALUATED",
      ]),
      generatedAt: new Date().toISOString(),
    };
  },

  // ==========================================
  // Account CRUD
  // ==========================================

  async list(
    actor: AuthUser,
    params: ListParams,
    query: { instituteId?: string; role?: string },
  ): Promise<Paginated<AuthUser>> {
    requireAdmin(actor);
    const instituteId =
      actor.adminRole === "SUPER_ADMIN"
        ? query.instituteId ?? null // super admin: any institute, or all
        : actor.instituteId;

    // RBAC: admins cannot view or filter accounts above their rank
    let allowedRoles: string[] | undefined;
    if (actor.adminRole === "SUPER_ADMIN") {
      allowedRoles = query.role ? [query.role] : undefined;
    } else if (actor.adminRole === "ORG_ADMIN") {
      const permitted = ["INSTITUTE_ADMIN", "ORG_ADMIN"];
      allowedRoles = query.role && permitted.includes(query.role) ? [query.role] : permitted;
    } else {
      // INSTITUTE_ADMIN can ONLY see institute admins
      allowedRoles = ["INSTITUTE_ADMIN"];
    }

    return adminRepository.list(params, { instituteId, allowedRoles });
  },

  async getById(actor: AuthUser, id: string): Promise<AuthUser> {
    const admin = await adminRepository.findById(id);
    if (!admin) throw AppError.notFound("Admin not found");
    requireInstituteAccess(actor, admin.instituteId);
    if (adminRoleRank(actor) < adminRoleRank(admin)) {
      throw AppError.notFound("Admin not found");
    }
    return admin;
  },

  async create(
    actor: AuthUser,
    input: {
      name: string;
      email: string;
      password: string;
      role: NonNullable<AuthUser["adminRole"]>;
      instituteId?: string;
    },
  ): Promise<AuthUser> {
    requireAdmin(actor);
    // Never mint an account more powerful than yourself.
    if (adminRoleRank(actor) < ROLE_RANK[input.role]) {
      throw AppError.forbidden("Cannot create an account with a higher role than your own");
    }
    const instituteId = await resolveTargetInstitute(actor, input.instituteId);
    const passwordHash = await hashPassword(input.password);
    try {
      return await adminRepository.create({
        id: randomUUID(),
        instituteId,
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw AppError.conflict("Email already registered");
      throw error;
    }
  },

  async update(
    actor: AuthUser,
    id: string,
    input: {
      name?: string;
      email?: string;
      password?: string;
      role?: NonNullable<AuthUser["adminRole"]>;
      instituteId?: string;
    },
  ): Promise<AuthUser> {
    requireAdmin(actor);
    const target = await adminRepository.findById(id);
    if (!target) throw AppError.notFound("Admin not found");
    requireInstituteAccess(actor, target.instituteId);

    const isSelf = target.id === actor.id;
    const targetRank = adminRoleRank(target);
    // Editing someone above you (or a colleague above you) is refused.
    if (!isSelf && adminRoleRank(actor) < targetRank) {
      throw AppError.forbidden("Cannot modify an account with a higher role than your own");
    }
    if (isSelf && input.role !== undefined && input.role !== target.adminRole) {
      throw AppError.conflict("Use another admin account to change your own role");
    }
    if (input.role !== undefined && adminRoleRank(actor) < ROLE_RANK[input.role]) {
      throw AppError.forbidden("Cannot grant a role higher than your own");
    }
    if (input.instituteId !== undefined && input.instituteId !== target.instituteId) {
      // Moving accounts between institutes follows the create-time rules.
      await resolveTargetInstitute(actor, input.instituteId);
    }

    const passwordHash = input.password !== undefined ? await hashPassword(input.password) : undefined;
    try {
      const updated = await adminRepository.update(id, {
        name: input.name,
        email: input.email,
        role: input.role,
        instituteId: input.instituteId,
        passwordHash,
      });
      if (!updated) throw AppError.notFound("Admin not found");
      // Password changed -> invalidate the target's sessions (PDF 10).
      if (passwordHash !== undefined) await adminRepository.revokeSession(id);
      return updated;
    } catch (error) {
      if (isUniqueViolation(error)) throw AppError.conflict("Email already registered");
      throw error;
    }
  },

  async remove(actor: AuthUser, id: string): Promise<void> {
    requireAdmin(actor);
    if (actor.id === id) {
      throw AppError.badRequest("Cannot delete your own account");
    }
    const target = await adminRepository.findById(id);
    if (!target) throw AppError.notFound("Admin not found");
    requireInstituteAccess(actor, target.instituteId);
    if (adminRoleRank(actor) < adminRoleRank(target)) {
      throw AppError.forbidden("Cannot delete an account with a higher role than your own");
    }
    await adminRepository.remove(id);
  },
};

/** Re-exported so routes can gate the role check without a second import. */
export { requireRoleRank, ROLE_RANK };
