import { randomUUID } from "node:crypto";
import { interviewRepository } from "../repositories/interview.repository";
import { roundRepository } from "../repositories/round.repository";
import type { AuthUser } from "../types/auth.types";
import type { ListParams, Paginated, Round, RoundType } from "../types/entities.types";
import { AppError } from "../utils/app-error.util";
import { requireAdmin, requireInstituteAccess } from "../utils/scope.util";

/**
 * Round service (PDF 13). Rounds hang off an interview; students may read
 * them only when the owning interview is published (non-DRAFT) and sits in
 * their own institute - checked on every read, including nested lists under
 * `/interviews/:interviewId/rounds`. Round creation follows the same rule;
 * updates and deletes remain admin-only.
 */

/** Interview visibility check used by both single and nested reads. */
async function requireInterviewVisible(
  actor: AuthUser,
  interviewId: string,
): Promise<{ instituteId: string }> {
  const interview = await interviewRepository.findById(interviewId);
  if (!interview) throw AppError.notFound("Interview not found");
  requireInstituteAccess(actor, interview.instituteId);
  if (actor.portal === "student" && interview.status === "DRAFT") {
    throw AppError.notFound("Interview not found");
  }
  return { instituteId: interview.instituteId };
}

async function loadScoped(actor: AuthUser, id: string): Promise<{
  round: Round;
  instituteId: string;
}> {
  const scope = await roundRepository.findByIdWithScope(id);
  if (!scope) throw AppError.notFound("Round not found");
  requireInstituteAccess(actor, scope.instituteId);
  if (actor.portal === "student" && scope.interviewStatus === "DRAFT") {
    throw AppError.notFound("Round not found");
  }
  return scope;
}

export const roundService = {
  async listByInterview(
    actor: AuthUser,
    interviewId: string,
    params: ListParams,
  ): Promise<Paginated<Round>> {
    await requireInterviewVisible(actor, interviewId);
    return roundRepository.listByInterview(interviewId, params);
  },

  async getById(actor: AuthUser, id: string): Promise<Round> {
    const { round } = await loadScoped(actor, id);
    return round;
  },

  async create(
    actor: AuthUser,
    interviewId: string,
    input: {
      name: string;
      sequenceOrder: number;
      roundType: RoundType;
      description?: string;
      estimatedDurationMinutes?: number | null;
      clientType?: string | null;
    },
  ): Promise<Round> {
    // Students may add rounds to any published (non-DRAFT) interview in their
    // own institute - the wizard needs this right after creating one. The
    // Interview model carries no owner column, so institute + publish state
    // is the whole ownership boundary available here.
    await requireInterviewVisible(actor, interviewId);
    return roundRepository.create({
      id: randomUUID(),
      interviewId,
      name: input.name,
      sequenceOrder: input.sequenceOrder,
      roundType: input.roundType,
      description: input.description,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      clientType: input.clientType ?? null,
    });
  },

  async update(
    actor: AuthUser,
    id: string,
    input: {
      name?: string;
      sequenceOrder?: number;
      roundType?: RoundType;
      description?: string;
      estimatedDurationMinutes?: number | null;
      clientType?: string | null;
    },
  ): Promise<Round> {
    requireAdmin(actor);
    await loadScoped(actor, id);
    const updated = await roundRepository.update(id, input);
    if (!updated) throw AppError.notFound("Round not found");
    return updated;
  },

  async remove(actor: AuthUser, id: string): Promise<void> {
    requireAdmin(actor);
    await loadScoped(actor, id);
    await roundRepository.remove(id);
  },
};
