import { apiFetch } from "./client";
import type { ApiResult } from "./types";
import type {
  ExtractedJobData,
  ParsedResume,
  ResumeMatchAnalysis,
  RoundType,
} from "@/lib/types/jobInterview";

/**
 * Interview CRUD API (list/detail/create/update/delete + nested rounds and
 * notes). Types mirror server/src/types/entities.types.ts - the server is
 * the source of truth for enum values and field caps (see
 * server/src/validations/interview.validation.ts for the Joi limits).
 */

// ---- Enum mirrors (server canonical values) ------------------------------

export const SERVER_INTERVIEW_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
] as const;
export type ServerInterviewStatus = (typeof SERVER_INTERVIEW_STATUSES)[number];

export const SERVER_ROUND_TYPES = ["AI_CHAT", "CODING", "VIDEO_PROCTORED"] as const;
export type ServerRoundType = (typeof SERVER_ROUND_TYPES)[number];

/** Stable server error code for "no active LLM config" (server ERROR_CODES). */
export const AI_NOT_CONFIGURED_CODE = "AI_NOT_CONFIGURED";

// ---- Response shapes ------------------------------------------------------

export interface ServerInterview {
  id: string;
  instituteId: string;
  title: string;
  description: string | null;
  jobRequirements: string | null;
  status: ServerInterviewStatus;
  targetRole: string | null;
  company: string | null;
  category: string | null;
  industry: string | null;
  experienceLevel: string | null;
  sessionDurationMinutes: number | null;
  eligibilityStatus: string | null;
  overallProgress: number;
  resume: Record<string, unknown> | null;
  extractedJobData: Record<string, unknown> | null;
  matchAnalysis: Record<string, unknown> | null;
  /** Aggregates computed server-side in the same statement (no N+1). */
  totalRounds: number;
  completedRounds: number;
  /** Creator's user id (student or admin). Null on rows from before stamping. */
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServerRound {
  id: string;
  interviewId: string;
  name: string;
  sequenceOrder: number;
  roundType: ServerRoundType;
  description: string;
  estimatedDurationMinutes: number | null;
  clientType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServerQuestion {
  id: string;
  roundId: string;
  prompt: string;
  expectedKeywords: string[] | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  createdAt: string;
  updatedAt: string;
}

export interface ServerNote {
  id: string;
  interviewId: string;
  roundId: string | null;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Request shapes -------------------------------------------------------

export interface InterviewListParams {
  page?: number;
  limit?: number;
  /** Free-text search over title + description (server ILIKE). */
  q?: string;
  status?: ServerInterviewStatus;
  /** SUPER_ADMIN only: narrow to one institute (pinned for everyone else). */
  instituteId?: string;
  sort?: "createdAt" | "title" | "status";
  order?: "asc" | "desc";
}

/**
 * Create payload. Optional fields are OMITTED (not null) when absent -
 * the create schema only accepts null on update. Every string is capped
 * server-side (title 200, description 4000, jobRequirements 8000, ...);
 * the mapper slices before sending.
 *
 * A `type` (not `interface`) so it carries an implicit index signature and
 * satisfies the fetch wrapper's `Record<string, unknown>` body.
 */
export type CreateInterviewPayload = {
  title: string;
  description?: string;
  jobRequirements?: string;
  status?: ServerInterviewStatus;
  targetRole?: string;
  company?: string;
  category?: string;
  industry?: string;
  experienceLevel?: string;
  sessionDurationMinutes?: number;
  eligibilityStatus?: string;
  overallProgress?: number;
  resume?: Record<string, unknown>;
  extractedJobData?: Record<string, unknown>;
  matchAnalysis?: Record<string, unknown>;
  /** Admin-only: defaults to the acting admin's institute server-side. */
  instituteId?: string;
}

/**
 * PATCH body: any subset of the create fields. Strings and json artifacts
 * additionally accept null (the update schema allows clearing them); numbers
 * and status do not.
 */
export type UpdateInterviewPayload = Partial<{
  [K in keyof CreateInterviewPayload]: K extends "sessionDurationMinutes"
    | "overallProgress"
    ? CreateInterviewPayload[K]
    : CreateInterviewPayload[K] | null;
}>;

export type CreateRoundPayload = {
  name: string;
  sequenceOrder: number;
  roundType: ServerRoundType;
  description?: string;
  estimatedDurationMinutes?: number | null;
  /** Client taxonomy label (aptitude/behavioral/...) kept for display. */
  clientType?: string | null;
};

export type CreateNotePayload = {
  content: string;
  roundId?: string;
};

// ---- Wizard analysis response (server shape == client domain types) ------

export type ServerWizardRound = {
  order: number;
  type: RoundType;
  title: string;
  description: string;
  estimatedDurationMinutes: number;
};

export type ServerWizardAnalysis = {
  extractedJobData: ExtractedJobData;
  parsedResume: ParsedResume | null;
  matchAnalysis: ResumeMatchAnalysis | null;
  rounds: ServerWizardRound[];
};

// ---- API object -----------------------------------------------------------

export const interviewsApi = {
  /** Paginated list. Scope (institute / DRAFT visibility) is applied server-side. */
  list(params: InterviewListParams = {}): Promise<ApiResult<ServerInterview[]>> {
    return apiFetch<ServerInterview[]>("/interviews", { query: { ...params } });
  },

  get(id: string): Promise<ApiResult<ServerInterview>> {
    return apiFetch<ServerInterview>(`/interviews/${id}`);
  },

  /** 201. 403 for student sessions (admin-only write). */
  create(payload: CreateInterviewPayload): Promise<ApiResult<ServerInterview>> {
    return apiFetch<ServerInterview>("/interviews", { method: "POST", body: payload });
  },

  update(id: string, payload: UpdateInterviewPayload): Promise<ApiResult<ServerInterview>> {
    return apiFetch<ServerInterview>(`/interviews/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  /** 204. */
  remove(id: string): Promise<ApiResult<void>> {
    return apiFetch<void>(`/interviews/${id}`, { method: "DELETE" });
  },

  // ---- AI analysis (wizard) --------------------------------------------------

  /**
   * 200 wizard analysis for a draft (draft owner or admin). The draft row's
   * own JD + resume text are the input. 503 `AI_NOT_CONFIGURED` when the
   * institute has no active LLM config - the client falls back to local
   * heuristics in that case.
   */
  analyzeDraft(id: string): Promise<ApiResult<ServerWizardAnalysis>> {
    return apiFetch<ServerWizardAnalysis>(`/interviews/${id}/analyze`, {
      method: "POST",
    });
  },

  // ---- Nested rounds ---------------------------------------------------

  listRounds(id: string, params: { page?: number; limit?: number } = {}): Promise<ApiResult<ServerRound[]>> {
    return apiFetch<ServerRound[]>(`/interviews/${id}/rounds`, {
      query: { ...params },
    });
  },

  /** 201. Admin-only write. */
  createRound(id: string, payload: CreateRoundPayload): Promise<ApiResult<ServerRound>> {
    return apiFetch<ServerRound>(`/interviews/${id}/rounds`, {
      method: "POST",
      body: payload,
    });
  },

  // ---- Round questions (student simulation flow) -----------------------------

  listQuestions(
    roundId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<ApiResult<ServerQuestion[]>> {
    return apiFetch<ServerQuestion[]>(`/rounds/${roundId}/questions`, {
      query: { ...params },
    });
  },

  /**
   * 200 with the round's questions, generating and persisting them first
   * when the round has none (wizard-created rounds start empty). 503
   * `AI_NOT_CONFIGURED` when the institute has no active LLM config - the
   * caller falls back to sample questions in that case.
   */
  ensureQuestions(
    roundId: string,
  ): Promise<ApiResult<{ questions: ServerQuestion[]; generated: boolean }>> {
    return apiFetch<{ questions: ServerQuestion[]; generated: boolean }>(
      `/rounds/${roundId}/questions/ensure`,
      { method: "POST" },
    );
  },

  // ---- Nested notes (both portals) ------------------------------------

  listNotes(id: string, params: { page?: number; limit?: number } = {}): Promise<ApiResult<ServerNote[]>> {
    return apiFetch<ServerNote[]>(`/interviews/${id}/notes`, {
      query: { ...params },
    });
  },

  /** 201. */
  createNote(id: string, payload: CreateNotePayload): Promise<ApiResult<ServerNote>> {
    return apiFetch<ServerNote>(`/interviews/${id}/notes`, {
      method: "POST",
      body: payload,
    });
  },

  /** 204. */
  removeNote(id: string, noteId: string): Promise<ApiResult<void>> {
    return apiFetch<void>(`/interviews/${id}/notes/${noteId}`, { method: "DELETE" });
  },

  // ---- Individual round operations -----------------------------------------

  /** 200. Inspect single round details. */
  getRound(roundId: string): Promise<ApiResult<ServerRound>> {
    return apiFetch<ServerRound>(`/rounds/${roundId}`);
  },

  /** 200. Update round configuration (admin). */
  updateRound(
    roundId: string,
    payload: Partial<CreateRoundPayload>,
  ): Promise<ApiResult<ServerRound>> {
    return apiFetch<ServerRound>(`/rounds/${roundId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  /** 204. Delete round from interview (admin). */
  deleteRound(roundId: string): Promise<ApiResult<void>> {
    return apiFetch<void>(`/rounds/${roundId}`, { method: "DELETE" });
  },

  /** 200. Pipeline view of all attempts for a specific round (admin). */
  listRoundAttempts(
    roundId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<ApiResult<unknown[]>> {
    return apiFetch<unknown[]>(`/rounds/${roundId}/attempts`, {
      query: { ...params },
    });
  },

  // ---- Question operations -------------------------------------------------

  /** 200. Inspect single question by ID. */
  getQuestion(questionId: string): Promise<ApiResult<ServerQuestion>> {
    return apiFetch<ServerQuestion>(`/questions/${questionId}`);
  },

  /** 201. Create custom question for a round (admin). */
  createQuestion(
    roundId: string,
    payload: {
      prompt: string;
      expectedKeywords?: string[];
      difficulty?: "EASY" | "MEDIUM" | "HARD";
    },
  ): Promise<ApiResult<ServerQuestion>> {
    return apiFetch<ServerQuestion>(`/rounds/${roundId}/questions`, {
      method: "POST",
      body: payload,
    });
  },

  /** 201. Commit a batch of preview questions to a round (admin). */
  createBatchQuestions(
    roundId: string,
    questions: Array<{
      prompt: string;
      expectedKeywords?: string[];
      difficulty?: "EASY" | "MEDIUM" | "HARD";
    }>,
  ): Promise<ApiResult<ServerQuestion[]>> {
    return apiFetch<ServerQuestion[]>(`/rounds/${roundId}/questions/batch`, {
      method: "POST",
      body: { questions },
    });
  },

  /** 200. Update a question's prompt, rubric, or difficulty (admin). */
  updateQuestion(
    questionId: string,
    payload: Partial<{
      prompt: string;
      expectedKeywords?: string[];
      difficulty?: "EASY" | "MEDIUM" | "HARD";
    }>,
  ): Promise<ApiResult<ServerQuestion>> {
    return apiFetch<ServerQuestion>(`/questions/${questionId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  /** 204. Delete question from round (admin). */
  deleteQuestion(questionId: string): Promise<ApiResult<void>> {
    return apiFetch<void>(`/questions/${questionId}`, { method: "DELETE" });
  },

  // ---- AI Drafting & Applications (graceful fallback if AI not active) ------

  /** 200 preview questions. Catches 503 if no LLM active. */
  generateQuestionsPreview(
    interviewId: string,
    payload: { count?: number; difficulty?: "EASY" | "MEDIUM" | "HARD"; roundId?: string } = {},
  ): Promise<ApiResult<{ questions: ServerQuestion[] }>> {
    return apiFetch<{ questions: ServerQuestion[] }>(
      `/interviews/${interviewId}/generate-questions`,
      { method: "POST", body: payload },
    );
  },

  /** 200 draft description. Catches 503 if no LLM active. */
  generateDescription(
    interviewId: string,
    payload: { role?: string; company?: string; techStack?: string[] } = {},
  ): Promise<ApiResult<{ description: string }>> {
    return apiFetch<{ description: string }>(
      `/interviews/${interviewId}/generate-description`,
      { method: "POST", body: payload },
    );
  },

  /** 200 applications specifically tied to this interview. */
  listApplications(
    interviewId: string,
    params: { page?: number; limit?: number; status?: string } = {},
  ): Promise<ApiResult<unknown[]>> {
    return apiFetch<unknown[]>(`/interviews/${interviewId}/applications`, {
      query: { ...params },
    });
  },
};

