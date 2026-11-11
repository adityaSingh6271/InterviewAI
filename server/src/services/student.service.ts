import { randomUUID } from "node:crypto";
import { instituteRepository } from "../repositories/institute.repository";
import { studentRepository } from "../repositories/student.repository";
import type { AuthUser } from "../types/auth.types";
import type { ListParams, Paginated } from "../types/entities.types";
import { AppError } from "../utils/app-error.util";
import { hashPassword } from "../utils/auth.util";
import {
  requireAdmin,
  requireInstituteAccess,
  requireOwnerOrInstitute,
} from "../utils/scope.util";

/**
 * Student service (PDF 13: business logic, framework-agnostic).
 *
 * Two callers:
 * - admins manage the students of their own institute (SUPER_ADMIN: any);
 * - a student reads/updates their own profile - `instituteId` transfers are
 *   admin-only, and every out-of-scope access answers 404 (no existence
 *   leak). Password changes revoke the target's refresh token (PDF 10).
 */

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: unknown }).code === "23505";
}

/** Load a student and authorize the actor against their row. */
async function loadScoped(actor: AuthUser, id: string): Promise<AuthUser> {
  const student = await studentRepository.findById(id);
  if (!student) throw AppError.notFound("Student not found");
  requireOwnerOrInstitute(actor, student.id, student.instituteId);
  return student;
}

async function resolveTargetInstitute(
  actor: AuthUser,
  requestedInstituteId: string | undefined,
  fallbackInstituteId: string,
): Promise<string> {
  requireAdmin(actor);
  const target = requestedInstituteId ?? fallbackInstituteId;
  if (actor.adminRole === "SUPER_ADMIN") {
    const exists = await instituteRepository.findById(target);
    if (!exists) throw AppError.notFound("Institute not found");
    return target;
  }
  if (target !== actor.instituteId) {
    throw AppError.forbidden("instituteId is outside your scope");
  }
  return target;
}

export const studentService = {
  async list(
    actor: AuthUser,
    params: ListParams,
    query: { instituteId?: string },
  ): Promise<Paginated<AuthUser>> {
    requireAdmin(actor);
    const instituteId =
      actor.adminRole === "SUPER_ADMIN"
        ? query.instituteId ?? null // super admin: any institute, or all
        : actor.instituteId;
    return studentRepository.list(params, { instituteId });
  },

  async getById(actor: AuthUser, id: string): Promise<AuthUser> {
    return loadScoped(actor, id);
  },

  /** Admin-provisioned account - the public register endpoint stays separate. */
  async create(
    actor: AuthUser,
    input: {
      name: string;
      email: string;
      password: string;
      instituteId?: string;
    },
  ): Promise<AuthUser> {
    const instituteId = await resolveTargetInstitute(actor, input.instituteId, actor.instituteId);
    const passwordHash = await hashPassword(input.password);
    try {
      return await studentRepository.create({
        id: randomUUID(),
        instituteId,
        name: input.name,
        email: input.email,
        passwordHash,
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
      instituteId?: string;
    },
  ): Promise<AuthUser> {
    const target = await loadScoped(actor, id);

    // Students may edit their own profile but never move themselves between
    // institutes - that field is admin-only (deny, don't strip silently).
    if (actor.portal === "student" && input.instituteId !== undefined) {
      throw AppError.forbidden("Only admins can move a student between institutes");
    }
    if (input.instituteId !== undefined && input.instituteId !== target.instituteId) {
      await resolveTargetInstitute(actor, input.instituteId, target.instituteId);
    }

    const passwordHash =
      input.password !== undefined ? await hashPassword(input.password) : undefined;
    try {
      const updated = await studentRepository.update(id, {
        name: input.name,
        email: input.email,
        instituteId: input.instituteId,
        passwordHash,
      });
      if (!updated) throw AppError.notFound("Student not found");
      // Password changed -> invalidate the target's sessions (PDF 10).
      if (passwordHash !== undefined) await studentRepository.revokeSession(id);
      return updated;
    } catch (error) {
      if (isUniqueViolation(error)) throw AppError.conflict("Email already registered");
      throw error;
    }
  },

  async remove(actor: AuthUser, id: string): Promise<void> {
    requireAdmin(actor);
    const target = await studentRepository.findById(id);
    if (!target) throw AppError.notFound("Student not found");
    requireInstituteAccess(actor, target.instituteId);
    await studentRepository.remove(id);
  },
};
