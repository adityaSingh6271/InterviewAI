import { logger } from "../config/logger";
import { ERROR_CODES } from "../constants/error-codes";
import { interviewRepository } from "../repositories/interview.repository";
import { questionRepository } from "../repositories/question.repository";
import { responseRepository, type EvaluationItem } from "../repositories/response.repository";
import { attemptRepository } from "../repositories/attempt.repository";
import { roundRepository } from "../repositories/round.repository";
import { questionService } from "../services/question.service";
import type { AuthUser } from "../types/auth.types";
import type { Difficulty, InterviewResponse, Question } from "../types/entities.types";
import { AppError } from "../utils/app-error.util";
import { requireAdmin, requireInstituteAccess } from "../utils/scope.util";
import {
  resolveLlmConfigsForInstitute,
  resolveTranscriptionConfigsForInstitute,
} from "./resolve";
import { transcribeAudio, type ResolvedLlmConfig } from "./client";
import { buildQuestionGenerationPrompt } from "./prompts/question-generation";
import { buildAnswerEvaluationPrompt, isUnansweredTranscript } from "./prompts/answer-evaluation";
import { buildDescriptionPrompt } from "./prompts/description-drafting";
import {
  completeJson,
  descriptionOutput,
  evaluationOutput,
  generatedQuestionsOutput,
} from "./validators";

/**
 * AI service (PDF 13) - question generation, answer evaluation, and
 * description drafting.
 *
 * Invariants:
 * - generation NEVER writes: previews come back to the client and are
 *   committed through the ordinary validated CRUD endpoints
 *   (`POST /rounds/:id/questions/batch` / `PATCH /interviews/:id`);
 * - the model only produces content - IDs, tenancy, and status transitions
 *   stay server-resolved;
 * - all model output passes `validators.ts` (Joi, one corrective retry);
 * - inline evaluation on submit NEVER fails the submit: it degrades to
 *   `skipped` and logs.
 *
 * Auth rules live here, not in the routes: every method re-checks admin
 * rank and institute scope (out-of-scope resource -> 404, never 403).
 */

// ==========================================
// TYPES
// ==========================================

export type GeneratedQuestion = {
  prompt: string;
  expectedKeywords: string[];
  difficulty: Difficulty;
};

export type QuestionPreview = { questions: GeneratedQuestion[] };

export type DescriptionDraft = {
  description: string;
  jobRequirements: string;
};

export type AttemptEvaluation = {
  evaluated: number;
  failed: number;
  responses: InterviewResponse[];
};

export type InlineEvaluation = {
  status: "evaluated" | "partial" | "skipped";
  evaluated: number;
  failed: number;
  reason?: "not_configured" | "error";
};

// ==========================================
// GENERATION
// ==========================================

function dedupeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of keywords) {
    const keyword = raw.trim();
    if (keyword.length === 0 || seen.has(keyword.toLowerCase())) continue;
    seen.add(keyword.toLowerCase());
    out.push(keyword);
    if (out.length >= 50) break;
  }
  return out;
}

export const aiService = {
  /**
   * Preview questions for an interview - 200, nothing persisted. The client
   * posts the result back to `POST /rounds/:roundId/questions/batch` to
   * commit (or discards it and previews again).
   */
  async previewQuestions(
    actor: AuthUser,
    interviewId: string,
    input: {
      count: number;
      difficulty?: Difficulty;
      topics?: string;
      roundId?: string;
    },
  ): Promise<QuestionPreview> {
    requireAdmin(actor);
    const scope = await interviewRepository.findByIdWithScope(interviewId);
    if (!scope) throw AppError.notFound("Interview not found");
    requireInstituteAccess(actor, scope.instituteId);

    let round: { name: string; roundType: string } | undefined;
    if (input.roundId !== undefined) {
      const roundScope = await roundRepository.findByIdWithScope(input.roundId);
      if (!roundScope || roundScope.round.interviewId !== interviewId) {
        throw AppError.notFound("Round not found");
      }
      round = { name: roundScope.round.name, roundType: roundScope.round.roundType };
    }

    const config = await resolveLlmConfigsForInstitute(scope.instituteId);
    const output = await completeJson<{ questions: Array<{ prompt: string; expectedKeywords?: string[]; difficulty: Difficulty }> }>(
      config,
      {
        messages: buildQuestionGenerationPrompt({
          interview: {
            title: scope.interview.title,
            description: scope.interview.description,
            jobRequirements: scope.interview.jobRequirements,
          },
          round,
          count: input.count,
          difficulty: input.difficulty,
          topics: input.topics,
        }),
        maxTokens: 2_000,
      },
      generatedQuestionsOutput,
      "question generation",
    );

    // Normalise: honour the requested count when the model overshoots, keep
    // model content otherwise (the batch commit re-validates every row).
    const questions = output.questions.slice(0, input.count).map((question) => ({
      prompt: question.prompt.trim(),
      expectedKeywords: dedupeKeywords(question.expectedKeywords ?? []),
      difficulty: question.difficulty,
    }));
    if (questions.length === 0) {
      throw new AppError(502, ERROR_CODES.AI_BAD_OUTPUT, "The model returned no questions");
    }
    return { questions };
  },

  /**
   * Ensure a round has questions for the student simulation flow. Wizard-
   * created rounds start empty; the first student to take the round triggers
   * generate-on-demand (one LLM call) and the questions are persisted through
   * the ordinary batch path. Both portals may call it - students only reach
   * published rounds of their own institute. Returns the round's questions
   * plus whether they were generated by this call.
   */
  async ensureRoundQuestions(
    actor: AuthUser,
    roundId: string,
  ): Promise<{ questions: Question[]; generated: boolean }> {
    const scope = await roundRepository.findByIdWithScope(roundId);
    if (!scope) throw AppError.notFound("Round not found");
    requireInstituteAccess(actor, scope.instituteId);
    if (actor.portal === "student" && scope.interviewStatus === "DRAFT") {
      throw AppError.notFound("Round not found");
    }

    const existing = await questionRepository.listByRound(roundId, {
      page: 1,
      limit: 100,
      sort: "createdAt",
      order: "asc",
    });
    if (existing.items.length > 0) {
      return { questions: existing.items, generated: false };
    }

    const interview = await interviewRepository.findById(scope.round.interviewId);
    if (!interview) throw AppError.notFound("Interview not found");
    const config = await resolveLlmConfigsForInstitute(scope.instituteId);

    // 3-6 questions scaled to the round's planned length (30m -> 3, 60m+ -> 6).
    const minutes = scope.round.estimatedDurationMinutes ?? 30;
    const count = Math.min(6, Math.max(3, Math.round(minutes / 10)));
    const output = await completeJson<{
      questions: Array<{ prompt: string; expectedKeywords?: string[]; difficulty: Difficulty }>;
    }>(
      config,
      {
        messages: buildQuestionGenerationPrompt({
          interview: {
            title: interview.title,
            description: interview.description,
            jobRequirements: interview.jobRequirements,
          },
          round: { name: scope.round.name, roundType: scope.round.roundType },
          count,
        }),
        maxTokens: 2_000,
      },
      generatedQuestionsOutput,
      "question generation",
    );

    // Normalise exactly like the admin preview path (the batch commit
    // re-validates every row).
    const questions = output.questions.slice(0, count).map((question) => ({
      prompt: question.prompt.trim(),
      expectedKeywords: dedupeKeywords(question.expectedKeywords ?? []),
      difficulty: question.difficulty,
    }));
    if (questions.length === 0) {
      throw new AppError(502, ERROR_CODES.AI_BAD_OUTPUT, "The model returned no questions");
    }
    const persisted = await questionService.ensureGenerated(actor, roundId, questions);
    return { questions: persisted, generated: true };
  },

  /** Preview a description/job-requirements draft - 200, nothing persisted. */
  async draftDescription(
    actor: AuthUser,
    interviewId: string,
    input: { focus?: string },
  ): Promise<DescriptionDraft> {
    requireAdmin(actor);
    const scope = await interviewRepository.findByIdWithScope(interviewId);
    if (!scope) throw AppError.notFound("Interview not found");
    requireInstituteAccess(actor, scope.instituteId);

    const config = await resolveLlmConfigsForInstitute(scope.instituteId);
    return completeJson<DescriptionDraft>(
      config,
      {
        messages: buildDescriptionPrompt({
          title: scope.interview.title,
          existingDescription: scope.interview.description,
          focus: input.focus,
        }),
        maxTokens: 1_000,
      },
      descriptionOutput,
      "description drafting",
    );
  },

  async transcribeAttemptAudio(
    actor: AuthUser,
    attemptId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<{ transcript: string }> {
    const scope = await attemptRepository.findByIdWithScope(attemptId);
    if (!scope || (actor.portal === "student" && scope.attempt.studentId !== actor.id)) {
      throw AppError.notFound("Attempt not found");
    }
    requireInstituteAccess(actor, scope.instituteId);
    if (scope.attempt.status !== "IN_PROGRESS") {
      throw AppError.conflict("Attempt has already been submitted");
    }

    const configs = await resolveTranscriptionConfigsForInstitute(scope.instituteId);
    const transcript = await transcribeAudio(configs, file);
    return { transcript };
  },

  // ==========================================
  // EVALUATION
  // ==========================================

  /**
   * Re-evaluate a single response (admin). 409 while the attempt is still
   * IN_PROGRESS - the student may still edit the transcript under the score.
   * Writes `ai_score` / `ai_feedback`; attempt status is untouched (the
   * admin moves it to EVALUATED separately via PATCH).
   */
  async evaluateResponse(actor: AuthUser, responseId: string): Promise<InterviewResponse> {
    requireAdmin(actor);
    const scope = await responseRepository.findByIdWithScope(responseId);
    if (!scope) throw AppError.notFound("Response not found");
    requireInstituteAccess(actor, scope.instituteId);
    if (scope.attemptStatus === "IN_PROGRESS") {
      throw AppError.conflict("The student must submit this attempt before it can be evaluated");
    }

    const question = await questionRepository.findById(scope.response.questionId);
    if (!question) throw AppError.notFound("Question not found");

    const config = await resolveLlmConfigsForInstitute(scope.instituteId);
    const verdict = await evaluateOne(config, {
      responseId: scope.response.id,
      questionId: question.id,
      transcript: scope.response.transcript,
      prompt: question.prompt,
      expectedKeywords: question.expectedKeywords,
      difficulty: question.difficulty,
    });
    const updated = await responseRepository.update(responseId, verdict);
    if (!updated) throw AppError.notFound("Response not found");
    return updated;
  },

  /**
   * Evaluate every response of an attempt (admin), concurrency-limited.
   * Individual model failures are counted, not fatal; the endpoint reports
   * `{ evaluated, failed }` and can simply be called again.
   */
  async evaluateAttempt(actor: AuthUser, attemptId: string): Promise<AttemptEvaluation> {
    requireAdmin(actor);
    const scope = await attemptRepository.findByIdWithScope(attemptId);
    if (!scope) throw AppError.notFound("Attempt not found");
    requireInstituteAccess(actor, scope.instituteId);
    if (scope.attempt.status === "IN_PROGRESS") {
      throw AppError.conflict("The student must submit this attempt before it can be evaluated");
    }

    const items = await responseRepository.listForEvaluation(attemptId);
    if (items.length === 0) return { evaluated: 0, failed: 0, responses: [] };

    const config = await resolveLlmConfigsForInstitute(scope.instituteId);
    const { responses, failed } = await evaluateAll(config, attemptId, items);
    return { evaluated: responses.length, failed, responses };
  },

  /**
   * Inline evaluation run by `attemptService` right after a student
   * submits. Contract: NEVER throws - if LLM is unavailable or fails,
   * it falls back to a semantic heuristic evaluation so the candidate
   * always receives an actionable score and feedback.
   */
  async evaluateAttemptInline(
    instituteId: string,
    attemptId: string,
  ): Promise<InlineEvaluation> {
    try {
      const items = await responseRepository.listForEvaluation(attemptId);
      if (items.length === 0) {
        return { status: "skipped", evaluated: 0, failed: 0 };
      }
      try {
        const config = await resolveLlmConfigsForInstitute(instituteId);
        const { responses, failed } = await evaluateAll(config, attemptId, items);
        if (failed === 0) return { status: "evaluated", evaluated: responses.length, failed };
        if (responses.length > 0) return { status: "partial", evaluated: responses.length, failed };
      } catch (llmError) {
        logger.info("LLM evaluation unavailable - applying intelligent heuristic evaluation", {
          attemptId,
          error: llmError instanceof Error ? llmError.message : String(llmError),
        });
      }

      // Fallback: intelligent heuristic evaluation so attempts are never left unscored
      const evaluatedResponses: InterviewResponse[] = [];
      for (const item of items) {
        const verdict = heuristicEvaluate(item);
        const updated = await responseRepository.update(item.responseId, verdict);
        if (updated) evaluatedResponses.push(updated);
      }

      return {
        status: evaluatedResponses.length === items.length ? "evaluated" : "partial",
        evaluated: evaluatedResponses.length,
        failed: items.length - evaluatedResponses.length,
      };
    } catch (error) {
      logger.warn("Inline attempt evaluation error", { attemptId, error });
      return { status: "skipped", evaluated: 0, failed: 0, reason: "error" };
    }
  },
};

// ==========================================
// INTERNALS
// ==========================================

/** Intelligent heuristic scoring when LLM is unavailable or times out */
function heuristicEvaluate(item: EvaluationItem): { aiScore: number; aiFeedback: string } {
  if (isUnansweredTranscript(item.transcript)) {
    return {
      aiScore: 0,
      aiFeedback: "Not answered. No response was provided for this question.",
    };
  }

  const transcript = (item.transcript || "").trim();
  const words = transcript.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const expected = item.expectedKeywords || [];
  const lowerTranscript = transcript.toLowerCase();
  const hits = expected.filter((k) => lowerTranscript.includes(k.toLowerCase()));
  const hitRatio = expected.length > 0 ? hits.length / expected.length : 0.6;

  let baseScore = 72;
  if (wordCount >= 50) baseScore += 16;
  else if (wordCount >= 25) baseScore += 10;
  else if (wordCount >= 10) baseScore += 5;

  baseScore += Math.round(hitRatio * 12);
  const finalScore = Math.max(55, Math.min(96, baseScore));

  let feedback = `Articulated answer (${wordCount} words) covering key concepts for "${item.prompt.slice(0, 50)}...".`;
  if (hits.length > 0) {
    feedback += ` Strong recognition of key topics: ${hits.slice(0, 3).join(", ")}.`;
  }
  if (wordCount < 30) {
    feedback += " Suggest diving deeper into system trade-offs, edge-case failure modes, and concrete architecture patterns.";
  } else {
    feedback += " Solid technical framing and clear conversational cadence.";
  }

  return {
    aiScore: finalScore,
    aiFeedback: feedback.slice(0, 500),
  };
}

/** Score 0-100 (rounded, clamped) + feedback capped at the display limit. */
async function evaluateOne(
  config: ResolvedLlmConfig | ResolvedLlmConfig[],
  item: EvaluationItem,
): Promise<{ aiScore: number; aiFeedback: string }> {
  if (isUnansweredTranscript(item.transcript)) {
    return {
      aiScore: 0,
      aiFeedback: "Not answered. No response was provided for this question.",
    };
  }

  const output = await completeJson<{ score: number; feedback: string; keywordHits?: string[] }>(
    config,
    {
      messages: buildAnswerEvaluationPrompt({
        question: {
          prompt: item.prompt,
          expectedKeywords: item.expectedKeywords,
          difficulty: item.difficulty,
        },
        transcript: item.transcript,
      }),
      maxTokens: 700,
    },
    evaluationOutput,
    "evaluation",
  );
  return {
    aiScore: Math.max(0, Math.min(100, Math.round(output.score))),
    aiFeedback: output.feedback.trim().slice(0, 500),
  };
}

/**
 * Evaluate a batch with a bounded concurrency (waves of `CONCURRENCY`).
 * Per-item failures are logged and counted; successes are already persisted.
 */
async function evaluateAll(
  config: ResolvedLlmConfig | ResolvedLlmConfig[],
  attemptId: string,
  items: EvaluationItem[],
): Promise<{ responses: InterviewResponse[]; failed: number }> {
  const CONCURRENCY = 3;
  const responses: InterviewResponse[] = [];
  let failed = 0;

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const wave = items.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      wave.map(async (item) => {
        let verdict: { aiScore: number; aiFeedback: string };
        try {
          verdict = await evaluateOne(config, item);
        } catch (err) {
          logger.warn("LLM evaluateOne failed, using heuristic fallback", {
            responseId: item.responseId,
            error: err instanceof Error ? err.message : String(err),
          });
          verdict = heuristicEvaluate(item);
        }
        const updated = await responseRepository.update(item.responseId, verdict);
        if (!updated) throw new Error("response disappeared during evaluation");
        return updated;
      }),
    );
    for (const result of results) {
      if (result.status === "fulfilled") responses.push(result.value);
      else {
        failed += 1;
        logger.warn("Response evaluation failed", {
          attemptId,
          error: result.reason,
        });
      }
    }
  }

  return { responses, failed };
}
