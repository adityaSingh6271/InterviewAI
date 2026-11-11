import { randomUUID } from "node:crypto";
import { aiService, type InlineEvaluation } from "../ai/ai.service";
import { attemptRepository } from "../repositories/attempt.repository";
import { interviewRepository } from "../repositories/interview.repository";
import { responseRepository } from "../repositories/response.repository";
import { roundRepository } from "../repositories/round.repository";
import { studentRepository } from "../repositories/student.repository";
import type { AuthUser } from "../types/auth.types";
import type {
  AttemptStatus,
  InterviewResponse,
  ListParams,
  Paginated,
  RoundAttempt,
} from "../types/entities.types";
import { AppError } from "../utils/app-error.util";
import { requireAdmin, requireInstituteAccess, requireOwnerOrInstitute } from "../utils/scope.util";

/**
 * Round attempt service (PDF 13) - the student side of the interview flow.
 *
 * Starting an attempt:
 * - student-only, round must belong to their institute and its interview
 *   must be ACTIVE;
 * - students may attempt a round as many times as they want: any prior
 *   dangling IN_PROGRESS attempt is finalized before creating a fresh
 *   attempt with `attempt_number = MAX + 1`.
 *
 * Submitting:
 * - the owner moves IN_PROGRESS -> COMPLETED (single transition, 409 after);
 * - an admin moves it on to EVALUATED after scoring.
 *
 * Responses attach only while the attempt is IN_PROGRESS, only to questions
 * of the attempt's round, one per question (UNIQUE -> 409).
 */

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: unknown }).code === "23505";
}

async function loadScoped(
  actor: AuthUser,
  id: string,
): Promise<{
  attempt: RoundAttempt;
  instituteId: string;
}> {
  const scope = await attemptRepository.findByIdWithScope(id);
  if (!scope) throw AppError.notFound("Attempt not found");
  requireOwnerOrInstitute(actor, scope.attempt.studentId, scope.instituteId);
  return { attempt: scope.attempt, instituteId: scope.instituteId };
}

export const attemptService = {
  /** Start a new attempt (student) - unlimited attempts permitted. */
  async start(actor: AuthUser, input: { roundId: string }): Promise<RoundAttempt> {
    if (actor.portal !== "student") {
      throw AppError.forbidden("Only students can start interview attempts");
    }
    const round = await roundRepository.findByIdWithScope(input.roundId);
    if (!round || round.instituteId !== actor.instituteId) {
      throw AppError.notFound("Round not found");
    }
    if (round.interviewStatus !== "ACTIVE") {
      throw AppError.conflict("Interview is not active");
    }

    // Finalize any previously abandoned IN_PROGRESS attempt so starting a new
    // attempt never fails with 409 Conflict.
    await attemptRepository.finalizeStaleInProgress(input.roundId, actor.id);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await attemptRepository.create({
          id: randomUUID(),
          roundId: input.roundId,
          studentId: actor.id,
        });
      } catch (error) {
        if (isUniqueViolation(error) && attempt === 0) {
          continue;
        }
        if (isUniqueViolation(error)) {
          throw AppError.conflict("Could not allocate a new attempt number - please retry");
        }
        throw error;
      }
    }
    throw AppError.conflict("Could not allocate a new attempt number - please retry");
  },

  /**
   * Paginated attempts. Admins filter by round/student/interview (all
   * tenant-checked with 404); students can only list their own, optionally
   * narrowed to one round or one interview of their institute.
   */
  async list(
    actor: AuthUser,
    params: ListParams,
    query: { roundId?: string; studentId?: string; interviewId?: string; status?: AttemptStatus },
  ): Promise<Paginated<RoundAttempt>> {
    if (actor.portal === "student") {
      if (query.studentId !== undefined && query.studentId !== actor.id) {
        throw AppError.notFound("Student not found");
      }
      if (query.roundId !== undefined) {
        const round = await roundRepository.findByIdWithScope(query.roundId);
        if (!round || round.instituteId !== actor.instituteId) {
          throw AppError.notFound("Round not found");
        }
      }
      if (query.interviewId !== undefined) {
        const interview = await interviewRepository.findByIdWithScope(query.interviewId);
        if (!interview || interview.instituteId !== actor.instituteId) {
          throw AppError.notFound("Interview not found");
        }
      }
      return attemptRepository.list(params, {
        roundId: query.roundId,
        studentId: actor.id,
        interviewId: query.interviewId,
        instituteId: null,
        status: query.status,
      });
    }

    requireAdmin(actor);
    let instituteId: string | null = actor.adminRole === "SUPER_ADMIN" ? null : actor.instituteId;
    if (query.roundId !== undefined) {
      const round = await roundRepository.findByIdWithScope(query.roundId);
      if (!round) throw AppError.notFound("Round not found");
      requireInstituteAccess(actor, round.instituteId);
      instituteId = null; // round filter already pins the tenant
    }
    if (query.interviewId !== undefined) {
      const interview = await interviewRepository.findByIdWithScope(query.interviewId);
      if (!interview) throw AppError.notFound("Interview not found");
      requireInstituteAccess(actor, interview.instituteId);
      instituteId = null; // interview filter already pins the tenant
    }
    if (query.studentId !== undefined) {
      const student = await studentRepository.findById(query.studentId);
      if (!student) throw AppError.notFound("Student not found");
      requireInstituteAccess(actor, student.instituteId);
    }
    return attemptRepository.list(params, {
      roundId: query.roundId,
      studentId: query.studentId,
      interviewId: query.interviewId,
      instituteId,
      status: query.status,
    });
  },

  /** Nested list: `/rounds/:roundId/attempts` (admin pipeline view). */
  async listByRound(
    actor: AuthUser,
    roundId: string,
    params: ListParams,
    query: { status?: AttemptStatus },
  ): Promise<Paginated<RoundAttempt>> {
    requireAdmin(actor);
    const round = await roundRepository.findByIdWithScope(roundId);
    if (!round) throw AppError.notFound("Round not found");
    requireInstituteAccess(actor, round.instituteId);
    return attemptRepository.list(params, {
      roundId,
      instituteId: null,
      status: query.status,
    });
  },

  /** Nested list: `/students/:studentId/attempts` (self or admin). */
  async listByStudent(
    actor: AuthUser,
    studentId: string,
    params: ListParams,
    query: { status?: AttemptStatus },
  ): Promise<Paginated<RoundAttempt>> {
    if (actor.portal === "student") {
      if (studentId !== actor.id) throw AppError.notFound("Student not found");
      return attemptRepository.list(params, {
        studentId: actor.id,
        instituteId: null,
        status: query.status,
      });
    }
    requireAdmin(actor);
    const student = await studentRepository.findById(studentId);
    if (!student) throw AppError.notFound("Student not found");
    requireInstituteAccess(actor, student.instituteId);
    return attemptRepository.list(params, {
      studentId,
      instituteId: null,
      status: query.status,
    });
  },

  async getById(actor: AuthUser, id: string): Promise<RoundAttempt> {
    const { attempt } = await loadScoped(actor, id);
    return attempt;
  },

  /**
   * Status transition.
   * - student (owner): IN_PROGRESS -> COMPLETED only, once (409 after);
   *   the submit also triggers inline AI evaluation of every response
   *   (never fatal - failures surface as `evaluation.meta` instead);
   * - admin: may also move a completed attempt to EVALUATED.
   *
   * Returns the attempt plus the inline evaluation verdict (student
   * submissions only) so the controller can attach it as response meta.
   */
  async updateStatus(
    actor: AuthUser,
    id: string,
    input: { status: AttemptStatus },
  ): Promise<{ attempt: RoundAttempt; evaluation?: InlineEvaluation }> {
    const { attempt, instituteId } = await loadScoped(actor, id);

    if (actor.portal === "student") {
      if (input.status !== "COMPLETED") {
        throw AppError.forbidden("Students can only submit their attempts");
      }
      if (attempt.status !== "IN_PROGRESS") {
        throw AppError.conflict("Attempt has already been submitted");
      }
      const submitted = await attemptRepository.updateStatus(id, "COMPLETED");
      if (!submitted) throw AppError.notFound("Attempt not found");
      // Best-effort scoring: resolve/parse/model failures degrade to
      // `skipped`/`partial` meta and are logged - the submit always succeeds.
      const evaluation = await aiService.evaluateAttemptInline(instituteId, id);
      return { attempt: submitted, evaluation };
    }

    requireAdmin(actor);
    if (input.status === "COMPLETED" && attempt.status === "IN_PROGRESS") {
      throw AppError.conflict("The student must submit this attempt first");
    }
    const updated = await attemptRepository.updateStatus(id, input.status);
    if (!updated) throw AppError.notFound("Attempt not found");
    return { attempt: updated };
  },

  async remove(actor: AuthUser, id: string): Promise<void> {
    requireAdmin(actor);
    await loadScoped(actor, id);
    await attemptRepository.remove(id);
  },

  // ==========================================
  // Responses (nested under /round-attempts/:attemptId/responses)
  // ==========================================

  async listResponses(
    actor: AuthUser,
    attemptId: string,
    params: ListParams,
  ): Promise<Paginated<InterviewResponse>> {
    await loadScoped(actor, attemptId); // owner student or institute admin
    return responseRepository.listByAttempt(attemptId, params);
  },

  /** Submit one answer (student, while the attempt is still in progress). */
  async createResponse(
    actor: AuthUser,
    attemptId: string,
    input: { questionId: string; transcript?: string },
  ): Promise<InterviewResponse> {
    if (actor.portal !== "student") {
      throw AppError.forbidden("Only students can submit responses");
    }
    const scope = await attemptRepository.findByIdWithScope(attemptId);
    // Someone else's attempt (or unknown id) is indistinguishable: 404.
    if (!scope || scope.attempt.studentId !== actor.id) {
      throw AppError.notFound("Attempt not found");
    }
    if (scope.attempt.status !== "IN_PROGRESS") {
      throw AppError.conflict("Attempt has already been submitted");
    }
    const belongs = await responseRepository.questionBelongsToRound(
      input.questionId,
      scope.attempt.roundId,
    );
    if (!belongs) {
      throw AppError.unprocessable("Response rejected", [
        { field: "questionId", message: "questionId does not belong to this round" },
      ]);
    }
    const normalizedTranscript =
      input.transcript && input.transcript.trim().length > 0
        ? input.transcript.trim()
        : "Not answered";

    try {
      return await responseRepository.create({
        id: randomUUID(),
        roundAttemptId: attemptId,
        questionId: input.questionId,
        transcript: normalizedTranscript,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw AppError.conflict("You already answered this question");
      }
      throw error;
    }
  },
};
