import type {
  CreateInterviewPayload,
  CreateRoundPayload,
  ServerInterview,
  ServerInterviewStatus,
  ServerNote,
  ServerRound,
  ServerRoundType,
  UpdateInterviewPayload,
} from "@/lib/api/interviews";
import type { ServerAttempt } from "@/lib/api/attempts";
import type {
  EligibilityStatus,
  ExtractedJobData,
  ImprovementArea,
  InterviewAttempt,
  InterviewNote,
  InterviewRound,
  JobInterview,
  JobInterviewStatus,
  MatchLabel,
  Priority,
  ResumeMatchAnalysis,
  ResumeReference,
  RoundType,
  SkillGap,
} from "@/lib/types/jobInterview";

/**
 * Server ⇄ UI mapping for the job-interview feature.
 *
 * The Express API owns the canonical vocabulary (InterviewStatus/RoundType);
 * the student-portal UI keeps its richer client vocabulary (see
 * lib/types/jobInterview.ts). This module is the single translation point -
 * hooks never hand-roll field mapping.
 */

// ---- Vocabulary tables -----------------------------------------------------

/** Server round type when the stored `client_type` label is missing/unknown. */
const SERVER_ROUND_TYPE_FALLBACK: Record<ServerRoundType, RoundType> = {
  AI_CHAT: "technical",
  CODING: "coding",
  VIDEO_PROCTORED: "custom",
};

const SERVER_TO_CLIENT_STATUS: Record<ServerInterviewStatus, JobInterviewStatus> = {
  DRAFT: "draft",
  ACTIVE: "ready",
  COMPLETED: "completed",
  ARCHIVED: "archived",
};

const CLIENT_TO_SERVER_STATUS: Record<JobInterviewStatus, ServerInterviewStatus> = {
  draft: "DRAFT",
  analysis_pending: "DRAFT",
  resume_review: "DRAFT",
  ready: "ACTIVE",
  in_progress: "ACTIVE",
  completed: "COMPLETED",
  archived: "ARCHIVED",
};

const ELIGIBILITY_VALUES: EligibilityStatus[] = [
  "pending",
  "eligible",
  "needs_resume_improvement",
  "insufficient_information",
];

/** Server caps (mirror of the Joi schemas - slice before sending). */
const CAPS = {
  title: 200,
  description: 4000,
  jobRequirements: 8000,
  targetRole: 200,
  company: 120,
  category: 120,
  industry: 120,
  experienceLevel: 80,
  eligibilityStatus: 60,
  roundName: 120,
  roundDescription: 2000,
  noteContent: 4000,
} as const;

function isClientRoundType(value: string): value is RoundType {
  return value === "aptitude" || value === "technical" || value === "coding"
    || value === "system_design" || value === "behavioral" || value === "hr"
    || value === "portfolio" || value === "case_study" || value === "custom";
}

function toClientStatus(status: ServerInterviewStatus): JobInterviewStatus {
  return SERVER_TO_CLIENT_STATUS[status] ?? "ready";
}

export function toServerStatus(status: JobInterviewStatus): ServerInterviewStatus {
  return CLIENT_TO_SERVER_STATUS[status] ?? "ACTIVE";
}

export function toServerRoundType(type: RoundType): ServerRoundType {
  return type === "coding" ? "CODING" : "AI_CHAT";
}

// ---- Server → UI -----------------------------------------------------------

function toClientRound(round: ServerRound, attempts: ServerAttempt[] = []): InterviewRound {
  const clientType = round.clientType;
  const roundAttempts = attempts.filter((attempt) => attempt.roundId === round.id);
  const bestScore = roundAttempts.reduce<number | undefined>(
    (best, attempt) =>
      attempt.aiScore == null ? best : best == null ? attempt.aiScore : Math.max(best, attempt.aiScore),
    undefined,
  );
  return {
    id: round.id,
    type:
      clientType && isClientRoundType(clientType)
        ? clientType
        : SERVER_ROUND_TYPE_FALLBACK[round.roundType],
    title: round.name,
    description: round.description ?? "",
    estimatedDurationMinutes: round.estimatedDurationMinutes ?? 30,
    order: round.sequenceOrder,
    status: roundAttempts.some((attempt) => attempt.status !== "IN_PROGRESS")
      ? "completed"
      : "not_started",
    attempts: roundAttempts.length,
    ...(bestScore !== undefined ? { bestScore } : {}),
  };
}

/** Attempt row -> view-model attempt (score/feedback are AI evaluation aggregates). */
function toClientAttempt(attempt: ServerAttempt, jobInterviewId: string): InterviewAttempt {
  const completedAt = attempt.submittedAt ?? attempt.createdAt;
  return {
    id: attempt.id,
    jobInterviewId,
    roundId: attempt.roundId,
    score: attempt.aiScore ?? 0,
    durationMinutes: Math.max(
      1,
      Math.round(
        (new Date(completedAt).getTime() - new Date(attempt.startedAt).getTime()) / 60_000,
      ),
    ),
    completedAt,
    ...(attempt.aiFeedback ? { feedback: attempt.aiFeedback } : {}),
  };
}

function toClientNote(note: ServerNote): InterviewNote {
  return {
    id: note.id,
    content: note.content,
    roundId: note.roundId ?? undefined,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/** JobInterview requires non-null artifacts; synthesize minimal shapes when
 *  the server has none (interview created without the wizard payload). */
function fallbackExtractedData(targetRole: string): ExtractedJobData {
  return {
    roleTitle: targetRole,
    requiredSkills: [],
    preferredSkills: [],
    responsibilities: [],
    qualifications: [],
    technologies: [],
    extractionConfidence: "low",
  };
}

/** Plain-object view of jsonb input, or `null` for primitives/arrays/null. */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
}

const MATCH_LABELS: MatchLabel[] = ["strong", "moderate", "weak"];
const PRIORITIES: Priority[] = ["high", "medium", "low"];

function matchLabelFor(score: number): MatchLabel {
  if (score >= 75) return "strong";
  if (score < 50) return "weak";
  return "moderate";
}

function toSkillGap(entry: unknown): SkillGap | null {
  if (typeof entry === "string" && entry.trim()) {
    return { skill: entry, priority: "medium", reason: "" };
  }
  const rec = asRecord(entry);
  if (!rec || typeof rec.skill !== "string" || !rec.skill.trim()) return null;
  return {
    skill: rec.skill,
    priority: PRIORITIES.includes(rec.priority as Priority)
      ? (rec.priority as Priority)
      : "medium",
    reason: typeof rec.reason === "string" ? rec.reason : "",
  };
}

function toImprovementArea(entry: unknown): ImprovementArea | null {
  const rec = asRecord(entry);
  if (!rec || typeof rec.title !== "string" || !rec.title.trim()) return null;
  return {
    title: rec.title,
    priority: PRIORITIES.includes(rec.priority as Priority)
      ? (rec.priority as Priority)
      : "medium",
    description: typeof rec.description === "string" ? rec.description : "",
    suggestion: typeof rec.suggestion === "string" ? rec.suggestion : "",
  };
}

/**
 * Coerce the stored `match_analysis` payload into a complete
 * `ResumeMatchAnalysis`.
 *
 * The column is free-form jsonb (the Joi schema accepts any object,
 * "validated by shape at the edges only"), so rows written by older writers or
 * other portals can miss fields the UI reads unconditionally - e.g.
 * `experienceAlignment`, which crashed ResumeMatchCard. Returns `undefined`
 * when the row carries no recognizable analysis at all.
 */
export function normalizeMatchAnalysis(raw: unknown): ResumeMatchAnalysis | undefined {
  const src = asRecord(raw);
  if (!src) return undefined;

  const hasKnownField = [
    "overallScore",
    "matchLabel",
    "matchedSkills",
    "missingSkills",
    "experienceAlignment",
    "improvementAreas",
  ].some((key) => key in src);
  if (!hasKnownField) return undefined;

  const rawScore = src.overallScore;
  const overallScore =
    typeof rawScore === "number" && Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, Math.round(rawScore)))
      : 0;

  const label = src.matchLabel;
  const matchLabel: MatchLabel = MATCH_LABELS.includes(label as MatchLabel)
    ? (label as MatchLabel)
    : matchLabelFor(overallScore);

  const alignment = asRecord(src.experienceAlignment);

  return {
    overallScore,
    matchLabel,
    matchedSkills: stringList(src.matchedSkills),
    missingSkills: (Array.isArray(src.missingSkills) ? src.missingSkills : [])
      .map(toSkillGap)
      .filter((gap): gap is SkillGap => gap !== null),
    experienceAlignment: {
      summary:
        alignment && typeof alignment.summary === "string" && alignment.summary.trim()
          ? alignment.summary
          : "No experience alignment summary was generated for this analysis.",
      strengths: alignment ? stringList(alignment.strengths) : [],
      gaps: alignment ? stringList(alignment.gaps) : [],
    },
    improvementAreas: (Array.isArray(src.improvementAreas) ? src.improvementAreas : [])
      .map(toImprovementArea)
      .filter((area): area is ImprovementArea => area !== null),
  };
}

/**
 * Map one server interview (+ its nested rows) to the `JobInterview` view
 * model the workspace/list components consume. List screens pass empty
 * rounds/notes/attempts arrays - the server still reports their aggregates.
 */
export function toJobInterview(
  interview: ServerInterview,
  rounds: ServerRound[] = [],
  notes: ServerNote[] = [],
  attempts: ServerAttempt[] = [],
): JobInterview {
  const titleParts = interview.title.split(" @ ");
  const targetRole = interview.targetRole ?? titleParts[0];
  const company =
    interview.company ?? (titleParts.length > 1 ? titleParts[1] : undefined);

  const eligibility = interview.eligibilityStatus;
  const eligibilityStatus: EligibilityStatus =
    eligibility && (ELIGIBILITY_VALUES as string[]).includes(eligibility)
      ? (eligibility as EligibilityStatus)
      : "pending";

  const totalRounds = interview.totalRounds;
  const completedRounds = interview.completedRounds;

  return {
    id: interview.id,
    title: interview.title,
    targetRole,
    company,
    category: interview.category ?? undefined,
    industry: interview.industry ?? undefined,
    experienceLevel: interview.experienceLevel ?? undefined,
    jobDescription: interview.description ?? "",
    resume:
      (interview.resume as ResumeReference | null) ?? {
        name: "Standard Candidate Profile",
        type: "text",
        content: "",
      },
    extractedJobData:
      (interview.extractedJobData as ExtractedJobData | null) ??
      fallbackExtractedData(targetRole),
    matchAnalysis: normalizeMatchAnalysis(interview.matchAnalysis),
    eligibilityStatus,
    sessionDurationMinutes: interview.sessionDurationMinutes ?? 30,
    rounds: rounds.map((round) => toClientRound(round, attempts)),
    notes: notes.map(toClientNote),
    attempts: attempts.map((attempt) => toClientAttempt(attempt, interview.id)),
    overallProgress:
      totalRounds > 0
        ? Math.round((completedRounds / totalRounds) * 100)
        : interview.overallProgress,
    totalRounds,
    completedRounds,
    status: toClientStatus(interview.status),
    createdBy: interview.createdBy ?? undefined,
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
  };
}

// ---- UI → Server -----------------------------------------------------------

/** Everything the creation wizard knows about a new interview. */
export interface InterviewDraftInput {
  title: string;
  targetRole: string;
  company?: string;
  category?: string;
  industry?: string;
  experienceLevel?: string;
  jobDescription: string;
  jobRequirements?: string;
  resume: ResumeReference;
  extractedJobData: ExtractedJobData;
  matchAnalysis?: ResumeMatchAnalysis;
  eligibilityStatus: EligibilityStatus;
  sessionDurationMinutes: number;
  status: ServerInterviewStatus;
}

/** Build the POST /interviews body. Optional strings are omitted when empty
 *  (the create schema rejects null; the update schema accepts it). */
export function toCreatePayload(draft: InterviewDraftInput): CreateInterviewPayload {
  const payload: CreateInterviewPayload = {
    title: draft.title.slice(0, CAPS.title),
    status: draft.status,
    targetRole: draft.targetRole.slice(0, CAPS.targetRole),
    eligibilityStatus: draft.eligibilityStatus.slice(0, CAPS.eligibilityStatus),
    sessionDurationMinutes: Math.min(600, Math.max(1, draft.sessionDurationMinutes)),
    overallProgress: 0,
    resume: draft.resume as unknown as Record<string, unknown>,
    extractedJobData: draft.extractedJobData as unknown as Record<string, unknown>,
  };
  if (draft.jobDescription) payload.description = draft.jobDescription.slice(0, CAPS.description);
  if (draft.jobRequirements) payload.jobRequirements = draft.jobRequirements.slice(0, CAPS.jobRequirements);
  if (draft.company) payload.company = draft.company.slice(0, CAPS.company);
  if (draft.category) payload.category = draft.category.slice(0, CAPS.category);
  if (draft.industry) payload.industry = draft.industry.slice(0, CAPS.industry);
  if (draft.experienceLevel) payload.experienceLevel = draft.experienceLevel.slice(0, CAPS.experienceLevel);
  if (draft.matchAnalysis) {
    payload.matchAnalysis = draft.matchAnalysis as unknown as Record<string, unknown>;
  }
  return payload;
}

/**
 * First wizard save (step 1 -> 2): a DRAFT holding just the JD. The title is
 * a placeholder derived from the JD's first line; the final publish replaces
 * it with "role @ company".
 */
export function toDraftCreatePayload(jobDescription: string): CreateInterviewPayload {
  const firstLine = jobDescription
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return {
    title: (firstLine || "Untitled role").slice(0, CAPS.title),
    description: jobDescription.slice(0, CAPS.description),
    status: "DRAFT",
  };
}

/** POST /interviews/:id/rounds body for one wizard-generated round. */
export function toRoundPayload(round: InterviewRound, index: number): CreateRoundPayload {
  return {
    name: (round.title || `Round ${index + 1}`).slice(0, CAPS.roundName),
    sequenceOrder: Math.min(999, Math.max(1, round.order || index + 1)),
    roundType: toServerRoundType(round.type),
    description: (round.description ?? "").slice(0, CAPS.roundDescription),
    estimatedDurationMinutes: round.estimatedDurationMinutes ?? undefined,
    clientType: round.type,
  };
}

/**
 * Build a PATCH body from a partial `JobInterview` update. Empty strings on
 * clearable fields become null (the update schema allows null, not "").
 * Json artifacts and numbers pass through unchanged.
 */
export function toUpdatePayload(updates: Partial<JobInterview>): UpdateInterviewPayload {
  const payload: UpdateInterviewPayload = {};
  const clearable = (value: string | undefined, cap: number): string | null | undefined =>
    value === undefined ? undefined : value === "" ? null : value.slice(0, cap);

  if (updates.title !== undefined) payload.title = updates.title.slice(0, CAPS.title) || "Untitled";
  if (updates.jobDescription !== undefined) {
    payload.description = updates.jobDescription.slice(0, CAPS.description);
  }
  if (updates.status !== undefined) payload.status = toServerStatus(updates.status);
  if (updates.targetRole !== undefined) {
    payload.targetRole = clearable(updates.targetRole, CAPS.targetRole);
  }
  if (updates.company !== undefined) payload.company = clearable(updates.company, CAPS.company);
  if (updates.category !== undefined) payload.category = clearable(updates.category, CAPS.category);
  if (updates.industry !== undefined) payload.industry = clearable(updates.industry, CAPS.industry);
  if (updates.experienceLevel !== undefined) {
    payload.experienceLevel = clearable(updates.experienceLevel, CAPS.experienceLevel);
  }
  if (updates.eligibilityStatus !== undefined) {
    payload.eligibilityStatus = clearable(updates.eligibilityStatus, CAPS.eligibilityStatus);
  }
  if (updates.sessionDurationMinutes !== undefined) {
    payload.sessionDurationMinutes = updates.sessionDurationMinutes;
  }
  if (updates.overallProgress !== undefined) payload.overallProgress = updates.overallProgress;
  if (updates.resume !== undefined) {
    payload.resume = updates.resume as unknown as Record<string, unknown>;
  }
  if (updates.extractedJobData !== undefined) {
    payload.extractedJobData = updates.extractedJobData as unknown as Record<string, unknown>;
  }
  if (updates.matchAnalysis !== undefined) {
    payload.matchAnalysis =
      updates.matchAnalysis as unknown as Record<string, unknown> | null;
  }
  return payload;
}
