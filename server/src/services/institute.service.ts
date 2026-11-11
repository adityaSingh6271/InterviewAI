import { randomBytes, randomUUID } from "node:crypto";
import { instituteRepository } from "../repositories/institute.repository";
import type { AuthUser } from "../types/auth.types";
import type { Institute, ListParams, Paginated } from "../types/entities.types";
import { AppError } from "../utils/app-error.util";
import {
  requireAdmin,
  requireRoleRank,
  ROLE_RANK,
} from "../utils/scope.util";

/**
 * Institute service (PDF 13). Institute access by role:
 *
 * | operation        | SUPER_ADMIN        | ORG_ADMIN            | INSTITUTE_ADMIN |
 * |------------------|--------------------|----------------------|-----------------|
 * | list             | all (opt. ?org)    | own organization     | own institute   |
 * | read             | any                | own organization     | own institute   |
 * | create           | any organization   | own organization     | - (403)         |
 * | update (name/code)| any              | own organization     | own institute   |
 * | update (org move)| any                | - (403)              | - (403)         |
 * | delete           | any                | own organization     | - (403)         |
 *
 * The acting admin's organization is resolved from their institute - one
 * indexed lookup, no org id is ever trusted from the client.
 */

/** Unrestricted scope marker for SUPER_ADMIN. */
const ALL = null;

type ListScope = { organizationId?: string | null; instituteId?: string | null };

/** List/read scope derived from the actor's role. */
async function actorScope(actor: AuthUser): Promise<ListScope> {
  requireAdmin(actor);
  if (actor.adminRole === "SUPER_ADMIN") return {};
  if (actor.adminRole === "ORG_ADMIN") {
    const organizationId = await instituteRepository.findOrganizationId(actor.instituteId);
    if (!organizationId) throw AppError.notFound("Resource not found");
    return { organizationId };
  }
  return { instituteId: actor.instituteId };
}

/** The actor's own organization (null when unrestricted super admin). */
async function actorOrganizationId(actor: AuthUser): Promise<string | null> {
  requireAdmin(actor);
  if (actor.adminRole === "SUPER_ADMIN") return ALL;
  const organizationId = await instituteRepository.findOrganizationId(actor.instituteId);
  if (!organizationId) throw AppError.notFound("Resource not found");
  return organizationId;
}

/**
 * Resolve the organization an institute write may target.
 * @throws 403 when the target is outside the actor's organization.
 */
async function resolveTargetOrganization(
  actor: AuthUser,
  requestedOrganizationId: string | undefined,
): Promise<string> {
  requireAdmin(actor);
  const ownOrganizationId = await actorOrganizationId(actor);
  if (ownOrganizationId === ALL) {
    if (requestedOrganizationId) return requestedOrganizationId;
    // Super admin without an explicit target: fall back to their own org.
    const fallback = await instituteRepository.findOrganizationId(actor.instituteId);
    if (!fallback) throw AppError.badRequest("organizationId is required");
    return fallback;
  }
  if (requestedOrganizationId && requestedOrganizationId !== ownOrganizationId) {
    throw AppError.forbidden("organizationId is outside your organization");
  }
  return ownOrganizationId;
}

/** May the actor write to `instituteId`? (read scope, 403 on violation) */
async function requireWriteScope(actor: AuthUser, instituteId: string): Promise<void> {
  requireAdmin(actor);
  if (actor.adminRole === "SUPER_ADMIN") return;
  if (actor.adminRole === "ORG_ADMIN") {
    const organizationId = await instituteRepository.findOrganizationId(actor.instituteId);
    const targetOrganizationId = await instituteRepository.findOrganizationId(instituteId);
    if (!organizationId || organizationId !== targetOrganizationId) {
      throw AppError.forbidden("Institute is outside your organization");
    }
    return;
  }
  if (actor.instituteId !== instituteId) {
    throw AppError.forbidden("Institute is outside your scope");
  }
}

/** Read scope check - out of scope is 404 (no existence leak). */
async function requireReadAccess(actor: AuthUser, instituteId: string): Promise<void> {
  const scope = await actorScope(actor);
  if (scope.instituteId && scope.instituteId !== instituteId) {
    throw AppError.notFound("Institute not found");
  }
  if (scope.organizationId) {
    const targetOrganizationId = await instituteRepository.findOrganizationId(instituteId);
    if (scope.organizationId !== targetOrganizationId) {
      throw AppError.notFound("Institute not found");
    }
  }
}

/** Invite codes are unique - collisions are astronomically rare but mapped. */
function generateJoinCode(): string {
  return `INST${randomBytes(5).toString("hex").toUpperCase()}`;
}

function mapUniqueViolation(error: unknown): never {
  if ((error as { code?: unknown }).code === "23505") {
    throw AppError.conflict("joinCode is already in use");
  }
  throw error;
}

export const instituteService = {
  async list(
    actor: AuthUser,
    params: ListParams,
    query: { organizationId?: string },
  ): Promise<Paginated<Institute>> {
    const scope = await actorScope(actor);
    // A super admin may narrow to one organization with ?organizationId.
    const organizationId =
      scope.organizationId ?? query.organizationId ?? ALL;
    return instituteRepository.list(params, {
      organizationId,
      instituteId: scope.instituteId ?? ALL,
    });
  },

  async getById(actor: AuthUser, id: string): Promise<Institute> {
    const institute = await instituteRepository.findById(id);
    if (!institute) throw AppError.notFound("Institute not found");
    await requireReadAccess(actor, institute.id);
    return institute;
  },

  async create(
    actor: AuthUser,
    input: { name: string; joinCode?: string; organizationId?: string },
  ): Promise<Institute> {
    requireRoleRank(actor, ROLE_RANK.ORG_ADMIN);
    const organizationId = await resolveTargetOrganization(actor, input.organizationId);
    try {
      return await instituteRepository.create({
        id: randomUUID(),
        organizationId,
        name: input.name,
        joinCode: input.joinCode ?? generateJoinCode(),
      });
    } catch (error) {
      mapUniqueViolation(error);
    }
  },

  async update(
    actor: AuthUser,
    id: string,
    input: { name?: string; joinCode?: string; organizationId?: string },
  ): Promise<Institute> {
    requireAdmin(actor);
    const existing = await instituteRepository.findById(id);
    if (!existing) throw AppError.notFound("Institute not found");
    await requireReadAccess(actor, id);

    if (input.organizationId !== undefined) {
      // Moving between organizations is super-admin territory.
      requireRoleRank(actor, ROLE_RANK.SUPER_ADMIN);
    }
    await requireWriteScope(actor, id);

    try {
      const updated = await instituteRepository.update(id, input);
      if (!updated) throw AppError.notFound("Institute not found");
      return updated;
    } catch (error) {
      mapUniqueViolation(error);
    }
  },

  async remove(actor: AuthUser, id: string): Promise<void> {
    requireAdmin(actor);
    const existing = await instituteRepository.findById(id);
    if (!existing) throw AppError.notFound("Institute not found");
    // Only SUPER_ADMIN / ORG_ADMIN may delete (INSTITUTE_ADMIN: 403).
    requireRoleRank(actor, ROLE_RANK.ORG_ADMIN);
    await requireWriteScope(actor, id);
    await instituteRepository.remove(id);
  },
};
