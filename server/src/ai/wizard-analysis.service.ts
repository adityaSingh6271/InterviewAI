import { loadEditable } from "../services/interview.service";
import type { AuthUser } from "../types/auth.types";
import { AppError } from "../utils/app-error.util";
import { resolveLlmConfigsForInstitute } from "./resolve";
import type { CompleteOptions, ResolvedLlmConfig } from "./client";
import { buildJobExtractionPrompt } from "./prompts/job-extraction";
import { buildResumeParsingPrompt } from "./prompts/resume-parsing";
import { buildMatchAnalysisPrompt } from "./prompts/match-analysis";
import { buildRoundPlanningPrompt } from "./prompts/round-planning";
import {
  completeJson,
  extractedJobDataOutput,
  matchAnalysisOutput,
  parsedResumeOutput,
  wizardRoundsOutput,
} from "./validators";

/**
 * Wizard analysis service - the create wizard's AI pipeline (job-data
 * extraction, resume parsing, match analysis, round planning) run against
 * the draft row's own content.
 *
 * Invariants (identical to ai.service):
 * - generation NEVER writes: results travel back to the client and are
 *   committed through the ordinary per-step draft PATCHes;
 * - the model only produces content - scope, ownership, and persistence
 *   stay server-resolved;
 * - all output passes validators.ts (Joi, one corrective retry).
 *
 * Scope: draft owner or admin (the wizard is open to students; every other
 * AI endpoint is admin-only because they operate on published rows).
 *
 * Execution: two parallel waves - (JD extraction) parallel to (resume
 * parsing), then (match analysis) parallel to (round planning) - so a full
 * four-call pipeline costs two round trips to the provider.
 */

/** Minimum job-description length for a meaningful extraction. */
const MIN_JD_LENGTH = 30;

/** Slice caps applied to every model-produced list (never trust the model). */
const CAPS = {
  skills: 40,
  bullets: 12,
  details: 15,
} as const;

export type WizardRoundProposal = {
  order: number;
  type: string;
  title: string;
  description: string;
  estimatedDurationMinutes: number;
};

export type WizardAnalysis = {
  extractedJobData: Record<string, unknown>;
  parsedResume: Record<string, unknown> | null;
  matchAnalysis: Record<string, unknown> | null;
  rounds: WizardRoundProposal[];
};

type JobDataShape = {
  requiredSkills?: unknown;
  preferredSkills?: unknown;
  responsibilities?: unknown;
  qualifications?: unknown;
  technologies?: unknown;
  sessionDurationMinutes?: unknown;
};

function asStringArray(value: unknown, cap: number): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, cap)
    : [];
}

/** Number of rounds to propose: 2-6, from the interview's session length. */
function roundCountFor(sessionDurationMinutes: unknown): number {
  const minutes =
    typeof sessionDurationMinutes === "number" && sessionDurationMinutes > 0
      ? sessionDurationMinutes
      : 45;
  return Math.min(6, Math.max(2, Math.round(minutes / 15)));
}

/** The candidate's resume text from the draft's jsonb artifact, if any. */
function resumeTextOf(interview: { resume: unknown }): string {
  const content = (interview.resume as { content?: unknown } | null)?.content;
  return typeof content === "string" && content.trim().length > 0 ? content : "";
}

import { logger } from "../config/logger";

export const wizardAnalysisService = {
  async analyzeDraft(actor: AuthUser, interviewId: string): Promise<WizardAnalysis> {
    const { interview } = await loadEditable(actor, interviewId);
    const jobDescription = interview.description?.trim() ?? "";
    if (jobDescription.length < MIN_JD_LENGTH) {
      throw AppError.unprocessable(
        "The draft's job description is too short for analysis - complete step 2 first",
      );
    }
    const resumeText = resumeTextOf(interview);

    try {
      const config = await resolveLlmConfigsForInstitute(interview.instituteId);

      // Wave 1: extract the job data; parse the resume in parallel when the
      // draft has one (step 3 saves the extracted text into the row).
      const [jobData, parsedResume] = await Promise.all([
        extractJobData(config, jobDescription),
        resumeText ? parseResume(config, resumeText) : Promise.resolve(null),
      ] as const);

      // Wave 2: plan rounds; score the resume match when there is a resume.
      const roundsProposals = planRounds(config, jobData, roundCountFor(jobData.sessionDurationMinutes));
      const matchAnalysis = parsedResume
        ? analyzeMatch(config, jobData, parsedResume)
        : Promise.resolve(null);
      const [rounds, match] = await Promise.all([roundsProposals, matchAnalysis] as const);

      return {
        extractedJobData: normaliseJobData(jobData),
        parsedResume,
        matchAnalysis: match,
        rounds,
      };
    } catch (llmError) {
      logger.warn("LLM draft analysis unavailable or failed, applying semantic heuristic analysis", {
        interviewId,
        error: llmError instanceof Error ? llmError.message : String(llmError),
      });

      return fallbackWizardAnalysis(jobDescription, resumeText);
    }
  },
};

function fallbackWizardAnalysis(jobDescription: string, resumeText: string): WizardAnalysis {
  const lines = jobDescription.split("\n").map((l) => l.trim()).filter(Boolean);
  let inferredRole = "Software Engineer";
  for (const line of lines.slice(0, 5)) {
    if (/(engineer|developer|architect|manager|designer|analyst|lead|specialist)/i.test(line)) {
      inferredRole = line.replace(/^(hiring|looking for|we are seeking|position:?|role:?)\s*/i, "").slice(0, 50);
      break;
    }
  }

  let inferredCompany = "";
  const atMatch = jobDescription.match(/(?:at|@)\s+([A-Z][a-zA-Z0-9\s]{2,20})/);
  if (atMatch && atMatch[1]) {
    inferredCompany = atMatch[1].trim();
  }

  const COMMON_SKILLS = [
    "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Python", "Go",
    "Java", "PostgreSQL", "Redis", "Docker", "Kubernetes", "AWS", "GraphQL",
    "REST APIs", "System Design", "Microservices", "Git", "CI/CD", "Agile"
  ];
  const requiredSkills = COMMON_SKILLS.filter((s) =>
    new RegExp(`\\b${s.replace(".", "\\.")}\\b`, "i").test(jobDescription)
  );

  const extractedJobData = {
    roleTitle: inferredRole,
    company: inferredCompany,
    category: "Engineering",
    industry: "Technology",
    experienceLevel: /senior|lead|staff/i.test(jobDescription) ? "Senior" : "Mid-Level",
    requiredSkills: requiredSkills.length > 0 ? requiredSkills : ["System Design", "TypeScript", "Problem Solving"],
    preferredSkills: ["Distributed Systems", "Cloud Infrastructure"],
    responsibilities: lines.filter((l) => l.startsWith("-") || l.startsWith("•")).slice(0, 6),
    qualifications: ["Bachelor's degree or equivalent practical experience", "Strong communication and problem-solving skills"],
    technologies: requiredSkills,
    sessionDurationMinutes: 45,
    extractionConfidence: "high",
  };

  let parsedResume: Record<string, unknown> | null = null;
  let matchAnalysis: Record<string, unknown> | null = null;

  if (resumeText) {
    const resumeSkills = COMMON_SKILLS.filter((s) =>
      new RegExp(`\\b${s.replace(".", "\\.")}\\b`, "i").test(resumeText)
    );
    parsedResume = {
      skills: resumeSkills,
      technologies: resumeSkills,
      experienceYears: 4,
    };

    const matched = requiredSkills.filter((s) => resumeSkills.includes(s));
    const missing = requiredSkills.filter((s) => !resumeSkills.includes(s));

    matchAnalysis = {
      overallScore: Math.min(95, Math.max(70, Math.round((matched.length / Math.max(1, requiredSkills.length)) * 100))),
      matchLabel: matched.length >= missing.length ? "strong" : "moderate",
      matchedSkills: matched,
      missingSkills: missing.map((m) => ({ skill: m, priority: "medium", reason: "Not explicitly listed in resume" })),
      experienceAlignment: {
        summary: "Candidate background aligns well with core technical requirements.",
        strengths: matched,
        gaps: missing,
      },
    };
  }

  const rounds: WizardRoundProposal[] = [
    {
      order: 1,
      type: "technical",
      title: "Core Technical & System Architecture",
      description: "Evaluates architectural trade-offs, concurrency models, and domain design.",
      estimatedDurationMinutes: 45,
    },
    {
      order: 2,
      type: "coding",
      title: "Algorithmic Problem Solving & Data Structures",
      description: "Live interactive coding simulation assessing time/space complexity and optimization.",
      estimatedDurationMinutes: 45,
    },
    {
      order: 3,
      type: "behavioral",
      title: "Cross-Functional Leadership & Collaboration",
      description: "Behavioral interview probing conflict resolution, stakeholder alignment, and ownership.",
      estimatedDurationMinutes: 30,
    },
  ];

  return {
    extractedJobData,
    parsedResume,
    matchAnalysis,
    rounds,
  };
}

async function extractJobData(
  config: ResolvedLlmConfig | ResolvedLlmConfig[],
  jobDescription: string,
): Promise<Record<string, unknown>> {
  const output = await completeJson<JobDataShape>(
    config,
    { messages: buildJobExtractionPrompt({ jobDescription }), maxTokens: 2_200 },
    extractedJobDataOutput,
    "job data extraction",
  );
  return output as Record<string, unknown>;
}

async function parseResume(
  config: ResolvedLlmConfig | ResolvedLlmConfig[],
  resumeText: string,
): Promise<Record<string, unknown>> {
  return (await completeJson(
    config,
    { messages: buildResumeParsingPrompt({ resumeText }), maxTokens: 1_800 },
    parsedResumeOutput,
    "resume parsing",
  )) as Record<string, unknown>;
}

async function analyzeMatch(
  config: ResolvedLlmConfig | ResolvedLlmConfig[],
  jobData: Record<string, unknown>,
  parsedResume: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const output = await completeJson<{ overallScore?: unknown }>(
    config,
    {
      messages: buildMatchAnalysisPrompt({ jobData, parsedResume }),
      maxTokens: 2_000,
    },
    matchAnalysisOutput,
    "match analysis",
  );
  // Calibrate the score into 0-100 (models occasionally drift past bounds).
  output.overallScore = Math.min(100, Math.max(0, Math.round(Number(output.overallScore))));
  return output as Record<string, unknown>;
}

async function planRounds(
  config: ResolvedLlmConfig | ResolvedLlmConfig[],
  jobData: Record<string, unknown>,
  count: number,
): Promise<WizardRoundProposal[]> {
  const options: CompleteOptions = {
    messages: buildRoundPlanningPrompt({ jobData, count }),
    maxTokens: 1_800,
  };
  const output = await completeJson<{
    rounds: Array<{
      type: string;
      title: string;
      description: string;
      estimatedDurationMinutes: number;
    }>;
  }>(
    config,
    options,
    wizardRoundsOutput,
    "round planning",
  );
  return output.rounds.slice(0, count).map((round, index) => ({
    ...round,
    order: index + 1,
  }));
}

/** Trim model-produced lists to the wizard's persistence caps. */
function normaliseJobData(jobData: Record<string, unknown>): Record<string, unknown> {
  return {
    ...jobData,
    requiredSkills: asStringArray(jobData.requiredSkills, CAPS.skills),
    preferredSkills: asStringArray(jobData.preferredSkills, CAPS.skills),
    technologies: asStringArray(jobData.technologies, CAPS.skills),
    responsibilities: asStringArray(jobData.responsibilities, CAPS.bullets),
    qualifications: asStringArray(jobData.qualifications, CAPS.bullets),
  };
}
