// ─── Core Enums / Literal Types ───────────────────────────────────────────────

export type JobInterviewStatus =
  | "draft"
  | "analysis_pending"
  | "resume_review"
  | "ready"
  | "in_progress"
  | "completed"
  | "archived";

export type EligibilityStatus =
  | "pending"
  | "eligible"
  | "needs_resume_improvement"
  | "insufficient_information";

export type RoundType =
  | "aptitude"
  | "technical"
  | "coding"
  | "system_design"
  | "behavioral"
  | "hr"
  | "portfolio"
  | "case_study"
  | "custom";

export type RoundStatus = "not_started" | "in_progress" | "completed";

export type ExtractionConfidence = "high" | "medium" | "low";

export type MatchLabel = "strong" | "moderate" | "weak";

export type Priority = "high" | "medium" | "low";

// ─── Resume ───────────────────────────────────────────────────────────────────

export interface ParsedResume {
  candidateName?: string;
  currentRole?: string;
  experienceYears?: number;
  skills: string[];
  technologies: string[];
  education: string[];
  certifications: string[];
  projects: string[];
  previousCompanies: string[];
  achievements: string[];
}

export interface ResumeReference {
  name: string;
  type: "uploaded" | "text";
  /**
   * Extracted resume text (never raw file bytes) - capped at the server's
   * RESUME_TEXT_MAX (50k chars) so it always fits a single API request.
   */
  content: string;
  parsedData?: ParsedResume;
  /** Source file size in bytes (server-side extraction only). */
  size?: number;
  /** MIME type of the uploaded file (server-side extraction only). */
  mimeType?: string;
  /** ISO timestamp of the server-side text extraction. */
  extractedAt?: string;
}

// ─── Job Data Extraction ──────────────────────────────────────────────────────

export interface ExtractedJobData {
  roleTitle: string;
  company?: string;
  category?: string;
  industry?: string;
  experienceLevel?: string;
  seniority?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  qualifications: string[];
  technologies: string[];
  inferredInterviewType?: string;
  sessionDurationMinutes?: number;
  extractionConfidence: ExtractionConfidence;
}

// ─── Resume Match Analysis ────────────────────────────────────────────────────

export interface SkillGap {
  skill: string;
  priority: Priority;
  reason: string;
}

export interface ExperienceAlignment {
  summary: string;
  strengths: string[];
  gaps: string[];
}

export interface ImprovementArea {
  title: string;
  priority: Priority;
  description: string;
  suggestion: string;
}

export interface ResumeMatchAnalysis {
  overallScore: number; // 0–100
  matchLabel: MatchLabel;
  matchedSkills: string[];
  missingSkills: SkillGap[];
  experienceAlignment: ExperienceAlignment;
  improvementAreas: ImprovementArea[];
}

// ─── Interview Rounds ─────────────────────────────────────────────────────────

export interface InterviewRound {
  id: string;
  type: RoundType;
  title: string;
  description: string;
  estimatedDurationMinutes: number;
  order: number;
  status: RoundStatus;
  attempts: number;
  bestScore?: number;
  latestScore?: number;
  completedAt?: string;
}

// ─── Attempts & Notes ─────────────────────────────────────────────────────────

export interface InterviewAttempt {
  id: string;
  jobInterviewId: string;
  roundId: string;
  score: number;
  durationMinutes: number;
  completedAt: string;
  notes?: string;
  feedback?: string;
}

export interface InterviewNote {
  id: string;
  content: string;
  roundId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Root Entity ──────────────────────────────────────────────────────────────

export interface JobInterview {
  id: string;
  title: string; // derived: "role @ company" or just role
  targetRole: string;
  company?: string;
  category?: string;
  industry?: string;
  experienceLevel?: string;
  jobDescription: string;
  resume: ResumeReference;
  extractedJobData: ExtractedJobData;
  matchAnalysis?: ResumeMatchAnalysis;
  eligibilityStatus: EligibilityStatus;
  sessionDurationMinutes: number;
  rounds: InterviewRound[];
  notes: InterviewNote[];
  attempts: InterviewAttempt[];
  /** 0–100 percentage of rounds completed */
  overallProgress: number;
  /**
   * Server-computed round aggregates. List responses carry these without
   * fetching every round's rows, so cards can show "(done/total)" - fall
   * back to `rounds` when absent (mock/local data).
   */
  totalRounds?: number;
  completedRounds?: number;
  status: JobInterviewStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Creation Wizard State ────────────────────────────────────────────────────

export interface JobInterviewDraft {
  jobDescription: string;
  resume?: ResumeReference;
  /** Overrides from extracted data that user has manually edited */
  userOverrides: {
    roleTitle?: string;
    company?: string;
    category?: string;
    industry?: string;
    experienceLevel?: string;
    sessionDurationMinutes?: number;
  };
  extractedJobData?: ExtractedJobData;
  parsedResume?: ParsedResume;
  matchAnalysis?: ResumeMatchAnalysis;
  generatedRounds?: InterviewRound[];
}
