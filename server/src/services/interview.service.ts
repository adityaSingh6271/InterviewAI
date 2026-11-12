import { randomUUID } from "node:crypto";
import { instituteRepository } from "../repositories/institute.repository";
import { interviewRepository, type InterviewWritable } from "../repositories/interview.repository";
import { interviewNoteRepository } from "../repositories/interview-note.repository";
import { roundRepository } from "../repositories/round.repository";
import type { AuthUser } from "../types/auth.types";
import type {
  Interview,
  InterviewNote,
  InterviewStatus,
  ListParams,
  Paginated,
} from "../types/entities.types";
import { AppError } from "../utils/app-error.util";
import { requireAdmin, requireInstituteAccess } from "../utils/scope.util";

/**
 * Interview service (PDF 13).
 *
 * Visibility rules:
 * - admins: the interviews of their own institute (SUPER_ADMIN: any);
 * - students: same institute; DRAFT rows only if they created them (both
 *   on single reads and in the list), so a draft id cannot be probed.
 *
 * `instituteId` on create is honoured only when the acting admin may reach
 * that institute; it always defaults to their own and is never client-trusted
 * for students, who are pinned to their own institute.
 *
 * Draft & ownership rules: a student may edit only a DRAFT they created
 * (the create wizard saves per step and publishes at the end), and may
 * delete any interview visible in their institute (own drafts or published
 * institute rows); someone else's DRAFT remains hidden (404). `createdBy` is
 * stamped server-side and is never client-writable.
 */

async function loadScoped(actor: AuthUser, id: string): Promise<{
  interview: Interview;
  instituteId: string;
}> {
  const scope = await interviewRepository.findByIdWithScope(id);
  if (!scope) throw AppError.notFound("Interview not found");
  requireInstituteAccess(actor, scope.instituteId);
  // Students must not learn that someone ELSE's DRAFT interview exists;
  // their own draft stays readable so the wizard can resume.
  if (
    actor.portal === "student" &&
    scope.interview.status === "DRAFT" &&
    scope.interview.createdBy !== actor.id
  ) {
    throw AppError.notFound("Interview not found");
  }
  return scope;
}

/**
 * Scope + edit-permission check, shared by interview PATCH and the wizard
 * analysis endpoint (`POST /interviews/:id/analyze`): admins may edit any
 * row in scope; students only a DRAFT they created themselves - published
 * rows are admin-managed again. Someone else's draft already answered 404
 * inside loadScoped (the defensive re-check keeps that promise explicit).
 */
export async function loadEditable(actor: AuthUser, id: string): Promise<{
  interview: Interview;
  instituteId: string;
}> {
  const scope = await loadScoped(actor, id);
  if (actor.portal === "student") {
    if (scope.interview.status !== "DRAFT") {
      throw AppError.forbidden("Published interviews can only be edited by admins");
    }
    if (scope.interview.createdBy !== actor.id) {
      throw AppError.notFound("Interview not found");
    }
  } else {
    requireAdmin(actor);
  }
  return scope;
}

export const interviewService = {
  async list(
    actor: AuthUser,
    params: ListParams,
    query: { status?: InterviewStatus; instituteId?: string },
  ): Promise<Paginated<Interview>> {
    if (actor.portal === "student") {
      return interviewRepository.list(params, {
        instituteId: actor.instituteId,
        studentViewerId: actor.id,
        status: query.status,
      });
    }
    requireAdmin(actor);
    const instituteId =
      actor.adminRole === "SUPER_ADMIN"
        ? query.instituteId ?? null // super admin: any institute, or all
        : actor.instituteId;
    return interviewRepository.list(params, {
      instituteId,
      status: query.status,
    });
  },

  async getById(actor: AuthUser, id: string): Promise<Interview> {
    const { interview } = await loadScoped(actor, id);
    return interview;
  },

  async create(
    actor: AuthUser,
    input: InterviewWritable & {
      title: string;
      status: InterviewStatus;
      instituteId?: string;
    },
  ): Promise<Interview> {
    // Students create inside their own institute; any client-supplied
    // instituteId is ignored rather than trusted. `status` is honoured as
    // sent (the wizard saves DRAFT per step and publishes on the last step);
    // their own draft remains visible to them - see loadScoped.
    if (actor.portal === "student") {
      return interviewRepository.create({
        ...input,
        id: randomUUID(),
        instituteId: actor.instituteId,
        createdBy: actor.id,
      });
    }
    requireAdmin(actor);
    const targetInstitute = input.instituteId ?? actor.instituteId;
    if (
      actor.adminRole !== "SUPER_ADMIN" &&
      targetInstitute !== actor.instituteId
    ) {
      throw AppError.forbidden("instituteId is outside your scope");
    }
    // The target institute must exist (super admin may target any).
    const institute = await instituteRepository.findById(targetInstitute);
    if (!institute) throw AppError.notFound("Institute not found");
    return interviewRepository.create({
      ...input,
      id: randomUUID(),
      instituteId: targetInstitute,
      createdBy: actor.id,
    });
  },

  async update(actor: AuthUser, id: string, input: InterviewWritable): Promise<Interview> {
    await loadEditable(actor, id);
    const updated = await interviewRepository.update(id, input);
    if (!updated) throw AppError.notFound("Interview not found");
    return updated;
  },

  async remove(actor: AuthUser, id: string): Promise<void> {
    await loadScoped(actor, id);
    if (actor.portal !== "student") {
      requireAdmin(actor);
    }
    await interviewRepository.remove(id);
  },

  // ---- Notes (both portals; scoped to the interview's institute) -------

  async listNotes(
    actor: AuthUser,
    interviewId: string,
    params: ListParams,
  ): Promise<Paginated<InterviewNote>> {
    await loadScoped(actor, interviewId);
    return interviewNoteRepository.listByInterview(interviewId, params);
  },

  async createNote(
    actor: AuthUser,
    interviewId: string,
    input: { content: string; roundId?: string },
  ): Promise<InterviewNote> {
    await loadScoped(actor, interviewId);
    // An optional round reference must belong to THIS interview.
    if (input.roundId) {
      const round = await roundRepository.findById(input.roundId);
      if (!round || round.interviewId !== interviewId) {
        throw AppError.notFound("Round not found for this interview");
      }
    }
    return interviewNoteRepository.create({
      id: randomUUID(),
      interviewId,
      roundId: input.roundId ?? null,
      content: input.content,
      createdBy: actor.id,
    });
  },

  async removeNote(actor: AuthUser, interviewId: string, noteId: string): Promise<void> {
    await loadScoped(actor, interviewId);
    const note = await interviewNoteRepository.findById(noteId);
    // Wrong interview or missing note - same 404, no existence leak.
    if (!note || note.interviewId !== interviewId) {
      throw AppError.notFound("Note not found");
    }
    // Students may only delete their own notes; admins of the institute any.
    if (actor.portal === "student" && note.createdBy !== actor.id) {
      throw AppError.notFound("Note not found");
    }
    await interviewNoteRepository.remove(noteId);
  },
};
