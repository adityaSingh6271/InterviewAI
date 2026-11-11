import { randomUUID } from "node:crypto";
import { organizationRepository } from "../repositories/organization.repository";
import type { AuthUser } from "../types/auth.types";
import type { ListParams, Organization, Paginated } from "../types/entities.types";
import { AppError } from "../utils/app-error.util";
import { requireRoleRank, ROLE_RANK } from "../utils/scope.util";

/**
 * Organization service (PDF 13: business logic, framework-agnostic, throws
 * typed AppErrors). Organizations are the top of the tenancy tree and are
 * SUPER_ADMIN-only end to end - the route gates the portal and role, this
 * layer re-checks as defence in depth.
 */

function requireSuper(actor: AuthUser): void {
  requireRoleRank(actor, ROLE_RANK.SUPER_ADMIN);
}

export const organizationService = {
  async list(actor: AuthUser, params: ListParams): Promise<Paginated<Organization>> {
    requireSuper(actor);
    return organizationRepository.list(params);
  },

  async getById(actor: AuthUser, id: string): Promise<Organization> {
    requireSuper(actor);
    const organization = await organizationRepository.findById(id);
    if (!organization) throw AppError.notFound("Organization not found");
    return organization;
  },

  async create(actor: AuthUser, input: { name: string }): Promise<Organization> {
    requireSuper(actor);
    return organizationRepository.create({ id: randomUUID(), name: input.name });
  },

  async update(
    actor: AuthUser,
    id: string,
    input: { name: string },
  ): Promise<Organization> {
    requireSuper(actor);
    const updated = await organizationRepository.update(id, input);
    if (!updated) throw AppError.notFound("Organization not found");
    return updated;
  },

  async remove(actor: AuthUser, id: string): Promise<void> {
    requireSuper(actor);
    // Missing row and already-deleted row are indistinguishable on purpose.
    const removed = await organizationRepository.remove(id);
    if (!removed) throw AppError.notFound("Organization not found");
  },
};
