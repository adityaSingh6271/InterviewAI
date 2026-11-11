import { randomUUID } from "node:crypto";
import { questionRepository } from "../repositories/question.repository";
import { roundRepository } from "../repositories/round.repository";
import type { AuthUser } from "../types/auth.types";
import type {
  Difficulty,
  ListParams,
  Paginated,
  Question,
} from "../types/entities.types";
import { AppError } from "../utils/app-error.util";
import { requireAdmin, requireInstituteAccess } from "../utils/scope.util";

/**
 * Question service (PDF 13). Questions hang off a round; students may read
 * them only when the owning interview is published (non-DRAFT) in their own
 * institute - required for taking the interview. Writes are admin-only.
 */

async function requireRoundVisible(
  actor: AuthUser,
  roundId: string,
): Promise<{ instituteId: string }> {
  const scope = await roundRepository.findByIdWithScope(roundId);
  if (!scope) throw AppError.notFound("Round not found");
  requireInstituteAccess(actor, scope.instituteId);
  if (actor.portal === "student" && scope.interviewStatus === "DRAFT") {
    throw AppError.notFound("Round not found");
  }
  return { instituteId: scope.instituteId };
}

async function loadScoped(actor: AuthUser, id: string): Promise<{
  question: Question;
  instituteId: string;
}> {
  const scope = await questionRepository.findByIdWithScope(id);
  if (!scope) throw AppError.notFound("Question not found");
  requireInstituteAccess(actor, scope.instituteId);
  if (actor.portal === "student" && scope.interviewStatus === "DRAFT") {
    throw AppError.notFound("Question not found");
  }
  return scope;
}

/** Row mapping shared by createBatch and ensureGenerated (one atomic INSERT). */
function toRows(
  roundId: string,
  questions: Array<{
    prompt: string;
    expectedKeywords?: string[];
    difficulty: Difficulty;
  }>,
) {
  return questions.map((question) => ({
    id: randomUUID(),
    roundId,
    prompt: question.prompt,
    expectedKeywords: question.expectedKeywords ?? null,
    difficulty: question.difficulty,
  }));
}

export const questionService = {
  async listByRound(
    actor: AuthUser,
    roundId: string,
    params: ListParams,
  ): Promise<Paginated<Question>> {
    await requireRoundVisible(actor, roundId);
    return questionRepository.listByRound(roundId, params);
  },

  async getById(actor: AuthUser, id: string): Promise<Question> {
    const { question } = await loadScoped(actor, id);
    return question;
  },

  async create(
    actor: AuthUser,
    roundId: string,
    input: {
      prompt: string;
      expectedKeywords?: string[];
      difficulty: Difficulty;
    },
  ): Promise<Question> {
    requireAdmin(actor);
    await requireRoundVisible(actor, roundId);
    return questionRepository.create({
      id: randomUUID(),
      roundId,
      prompt: input.prompt,
      expectedKeywords: input.expectedKeywords ?? null,
      difficulty: input.difficulty,
    });
  },

  /**
   * Bulk commit (`POST /rounds/:roundId/questions/batch`) - the persist half
   * of the AI preview-then-confirm flow, also usable for hand-written bulk
   * input. Rows pass the same Joi schema as single creation; the whole batch
   * lands in one atomic INSERT.
   */
  async createBatch(
    actor: AuthUser,
    roundId: string,
    questions: Array<{
      prompt: string;
      expectedKeywords?: string[];
      difficulty: Difficulty;
    }>,
  ): Promise<Question[]> {
    requireAdmin(actor);
    await requireRoundVisible(actor, roundId);
    return questionRepository.createBatch(toRows(roundId, questions));
  },

  /**
   * Persist generated questions for a round that has none yet - the student
   * simulation flow's generate-on-demand path. Unlike createBatch this is
   * NOT admin-only: the caller is the student about to take the round, so
   * only visibility is enforced (published interview, own institute).
   */
  async ensureGenerated(
    actor: AuthUser,
    roundId: string,
    questions: Array<{
      prompt: string;
      expectedKeywords?: string[];
      difficulty: Difficulty;
    }>,
  ): Promise<Question[]> {
    await requireRoundVisible(actor, roundId);
    return questionRepository.createBatch(toRows(roundId, questions));
  },

  async update(
    actor: AuthUser,
    id: string,
    input: {
      prompt?: string;
      expectedKeywords?: string[] | null;
      difficulty?: Difficulty;
    },
  ): Promise<Question> {
    requireAdmin(actor);
    await loadScoped(actor, id);
    const updated = await questionRepository.update(id, input);
    if (!updated) throw AppError.notFound("Question not found");
    return updated;
  },

  async remove(actor: AuthUser, id: string): Promise<void> {
    requireAdmin(actor);
    await loadScoped(actor, id);
    await questionRepository.remove(id);
  },
};
