import { responseRepository } from "../repositories/response.repository";
import type { AuthUser } from "../types/auth.types";
import type { InterviewResponse } from "../types/entities.types";
import { AppError } from "../utils/app-error.util";
import { requireAdmin, requireInstituteAccess, requireOwnerOrInstitute } from "../utils/scope.util";

/**
 * Response service (PDF 13) - read/evaluate/delete of submitted answers.
 *
 * - read: the owning student or an admin of the student's institute;
 * - update: an admin scores freely (`aiScore`/`aiFeedback`); the owning
 *   student may correct their `transcript` only while the attempt is still
 *   IN_PROGRESS and can never touch evaluation fields;
 * - delete: admin, or the owner while still in progress.
 *
 * Every path resolves the attempt owner + institute in one scoped query, so
 * out-of-scope ids answer 404 (no existence leak).
 */

async function loadScoped(
  actor: AuthUser,
  id: string,
): Promise<{
  response: InterviewResponse;
  studentId: string;
  instituteId: string;
  attemptStatus: string;
}> {
  const scope = await responseRepository.findByIdWithScope(id);
  if (!scope) throw AppError.notFound("Response not found");
  requireOwnerOrInstitute(actor, scope.studentId, scope.instituteId);
  return {
    response: scope.response,
    studentId: scope.studentId,
    instituteId: scope.instituteId,
    attemptStatus: scope.attemptStatus,
  };
}

export const responseService = {
  async getById(actor: AuthUser, id: string): Promise<InterviewResponse> {
    const { response } = await loadScoped(actor, id);
    return response;
  },

  async update(
    actor: AuthUser,
    id: string,
    input: {
      transcript?: string | null;
      aiScore?: number | null;
      aiFeedback?: string | null;
    },
  ): Promise<InterviewResponse> {
    const scope = await responseRepository.findByIdWithScope(id);
    if (!scope) throw AppError.notFound("Response not found");

    if (actor.portal === "student") {
      if (scope.studentId !== actor.id) throw AppError.notFound("Response not found");
      const touchesEvaluation = input.aiScore !== undefined || input.aiFeedback !== undefined;
      if (touchesEvaluation) {
        throw AppError.forbidden("Only admins can set evaluation fields");
      }
      if (scope.attemptStatus !== "IN_PROGRESS") {
        throw AppError.conflict("Attempt has already been submitted");
      }
      const updated = await responseRepository.update(id, { transcript: input.transcript });
      if (!updated) throw AppError.notFound("Response not found");
      return updated;
    }

    requireAdmin(actor);
    requireInstituteAccess(actor, scope.instituteId);
    const updated = await responseRepository.update(id, input);
    if (!updated) throw AppError.notFound("Response not found");
    return updated;
  },

  async remove(actor: AuthUser, id: string): Promise<void> {
    const scope = await responseRepository.findByIdWithScope(id);
    if (!scope) throw AppError.notFound("Response not found");

    if (actor.portal === "student") {
      if (scope.studentId !== actor.id) throw AppError.notFound("Response not found");
      if (scope.attemptStatus !== "IN_PROGRESS") {
        throw AppError.conflict("Attempt has already been submitted");
      }
    } else {
      requireAdmin(actor);
      requireInstituteAccess(actor, scope.instituteId);
    }
    await responseRepository.remove(id);
  },
};
