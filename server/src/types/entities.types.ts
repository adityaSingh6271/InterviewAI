/**
 * Domain types for the InterviewAI resources (PDF 3: repositories return
 * camelCase domain objects, never raw pg rows). Auth identities live in
 * `auth.types.ts`; these cover the org hierarchy and the interview pipeline.
 *
 * All dates are ISO-8601 strings - repositories call `.toISOString()` on the
 * TIMESTAMPTZ values they read. The enum value lists double as the single
 * source of truth for validation schemas (`Joi.string().valid(...)`).
 */

// ==========================================
// ENUM VALUE LISTS (shared by validation)
// ==========================================

export const ADMIN_ROLES = ["SUPER_ADMIN", "ORG_ADMIN", "INSTITUTE_ADMIN"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const INTERVIEW_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const ROUND_TYPES = ["AI_CHAT", "CODING", "VIDEO_PROCTORED"] as const;
export type RoundType = (typeof ROUND_TYPES)[number];

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const ATTEMPT_STATUSES = ["IN_PROGRESS", "COMPLETED", "EVALUATED"] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const APPLICATION_STATUSES = ["APPLIED", "SHORTLISTED", "INTERVIEWED", "REJECTED"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Attempt states a student is allowed to move their own attempt to. */
export const STUDENT_ATTEMPT_TARGETS = ["COMPLETED"] as const;

// ==========================================
// ENTITIES
// ==========================================

export type Organization = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

/** LLM configuration - the API key is write-only and never serialised out. */
export type LlmConfig = {
  id: string;
  organizationId: string;
  provider: string;
  modelName: string;
  settings: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Institute = {
  id: string;
  organizationId: string;
  name: string;
  /** Invite code students enter at self-registration. */
  joinCode: string;
  createdAt: string;
  updatedAt: string;
};

export type Interview = {
  id: string;
  instituteId: string;
  title: string;
  description: string | null;
  jobRequirements: string | null;
  status: InterviewStatus;
  /** Role being hiring-practiced; `title` stays "Role @ Company". */
  targetRole: string | null;
  company: string | null;
  category: string | null;
  industry: string | null;
  experienceLevel: string | null;
  sessionDurationMinutes: number | null;
  /** Heuristic eligibility label from the create wizard, when present. */
  eligibilityStatus: string | null;
  /** Client-maintained progress percentage (0-100). */
  overallProgress: number;
  /** ResumeReference jsonb (name/type/content/parsedData), or null. */
  resume: Record<string, unknown> | null;
  /** ExtractedJobData jsonb from the wizard analysis step. */
  extractedJobData: Record<string, unknown> | null;
  /** ResumeMatchAnalysis jsonb from the wizard analysis step. */
  matchAnalysis: Record<string, unknown> | null;
  /** Creator user id (nullable for legacy rows) - owns DRAFT edit rights. */
  createdBy: string | null;
  /** Aggregates - computed by correlated subqueries, never N+1. */
  totalRounds: number;
  completedRounds: number;
  createdAt: string;
  updatedAt: string;
};

export type StudentApplication = {
  id: string;
  interviewId: string;
  studentId: string;
  resumeFileUrl: string | null;
  resumeText: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
};

export type Round = {
  id: string;
  interviewId: string;
  name: string;
  sequenceOrder: number;
  roundType: RoundType;
  description: string;
  estimatedDurationMinutes: number | null;
  /** Client-side round taxonomy label (aptitude/behavioral/...). */
  clientType: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Free-form note on an interview (optionally scoped to one round). */
export type InterviewNote = {
  id: string;
  interviewId: string;
  roundId: string | null;
  content: string;
  /** Acting user's id - may live in either portal's table. */
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type Question = {
  id: string;
  roundId: string;
  prompt: string;
  /** Array of keywords for AI evaluation (JSONB, validated on write). */
  expectedKeywords: string[] | null;
  difficulty: Difficulty;
  createdAt: string;
  updatedAt: string;
};

export type RoundAttempt = {
  id: string;
  roundId: string;
  studentId: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Aggregate of the attempt's response scores (null until AI evaluation lands). */
  aiScore: number | null;
  /** Examiner feedback from the attempt's strongest scored response (summary). */
  aiFeedback: string | null;
};

/** Named without the `Response` clash with Express' `Response` type. */
export type InterviewResponse = {
  id: string;
  roundAttemptId: string;
  questionId: string;
  transcript: string | null;
  aiScore: number | null;
  aiFeedback: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

// ==========================================
// LIST / PAGINATION
// ==========================================

/** Standard list query params (Standards PDF 27), already Joi-validated. */
export type ListParams = {
  page: number;
  limit: number;
  sort: string;
  order: "asc" | "desc";
  q?: string;
};

/** Paginated service result - `meta` is spread into the response envelope. */
export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
