import Joi from "joi";
import { logger } from "../config/logger";
import { ERROR_CODES } from "../constants/error-codes";
import { AppError } from "../utils/app-error.util";
import { complete, type ChatMessage, type ResolvedLlmConfig } from "./client";
import { WIZARD_ROUND_TYPES } from "./prompts/round-planning";

/**
 * Model output is untrusted input - it goes through exactly the same
 * discipline as a client request (Joi, stripUnknown, convert, abortEarly).
 *
 * `completeJson`:
 * 1. asks the model for JSON (the prompts demand a bare JSON object);
 * 2. strips optional code fences and parses;
 * 3. validates against the task's schema;
 * 4. on parse OR validation failure, sends ONE corrective retry carrying the
 *    exact problem back to the model;
 * 5. still failing -> 502 `AI_BAD_OUTPUT` (never a raw string, never a 500).
 *
 * Schemas here are structurally strict but content-lenient: services
 * normalise values (clamp scores, dedupe/trim keywords) instead of burning
 * a retry on cosmetic violations.
 */

const JOI_OPTIONS: Joi.ValidationOptions = {
  abortEarly: false,
  stripUnknown: true,
  convert: true,
};

const MAX_CORRECTIVE_ATTEMPTS = 2; // 1 initial + 1 corrective retry

/** Remove ```json fences / surrounding prose, then parse. Returns null on failure. */
function parseJson(raw: string): unknown | null {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence?.[1] !== undefined) text = fence[1];
  if (!text.startsWith("{") && !text.startsWith("[")) {
    const firstOpen = text.indexOf("{");
    const lastClose = text.lastIndexOf("}");
    if (firstOpen === -1 || lastClose <= firstOpen) return null;
    text = text.slice(firstOpen, lastClose + 1);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export type JsonCompletionOptions = {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};

async function completeJsonWithSingleConfig<T>(
  config: ResolvedLlmConfig,
  options: JsonCompletionOptions,
  schema: Joi.Schema,
  label: string,
): Promise<T> {
  let messages = options.messages;
  let problem = "";

  for (let attempt = 1; attempt <= MAX_CORRECTIVE_ATTEMPTS; attempt += 1) {
    const raw = await complete(config, {
      messages,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      timeoutMs: options.timeoutMs,
    });

    const parsed = parseJson(raw);
    if (parsed !== null) {
      const { error, value } = schema.validate(parsed, JOI_OPTIONS);
      if (!error) return value as T;
      problem = error.message;
    } else {
      problem = "the reply was not a JSON object";
    }

    if (attempt < MAX_CORRECTIVE_ATTEMPTS) {
      messages = [
        ...options.messages,
        { role: "assistant", content: raw.slice(0, 1_500) },
        {
          role: "user",
          content:
            `Your reply was rejected: ${problem.slice(0, 400)}. ` +
            "Reply again with ONLY a valid JSON object matching the required shape - no prose, no markdown, no code fences.",
        },
      ];
    }
  }

  throw new AppError(
    502,
    ERROR_CODES.AI_BAD_OUTPUT,
    `The model returned an unusable ${label} response`,
  );
}

/**
 * Complete, parse, and validate a JSON model response. When multiple candidate
 * configs are provided, fails over across candidates on upstream/output errors.
 *
 * @throws AppError 502 `AI_BAD_OUTPUT` / `AI_UPSTREAM_ERROR` when every candidate fails.
 */
export async function completeJson<T>(
  configOrConfigs: ResolvedLlmConfig | ResolvedLlmConfig[],
  options: JsonCompletionOptions,
  schema: Joi.Schema,
  label: string,
): Promise<T> {
  const configs = Array.isArray(configOrConfigs) ? configOrConfigs : [configOrConfigs];
  let lastError: unknown;

  for (let idx = 0; idx < configs.length; idx += 1) {
    const candidate = configs[idx]!;
    try {
      return await completeJsonWithSingleConfig<T>(candidate, options, schema, label);
    } catch (error) {
      lastError = error;
      if (!(error instanceof AppError) || idx === configs.length - 1) {
        throw error;
      }
      logger.warn("LLM candidate failed; trying next configured model/provider", {
        task: label,
        failedProvider: candidate.provider,
        failedModel: candidate.modelName,
        statusCode: error.statusCode,
        error: error.message,
      });
    }
  }

  throw lastError;
}

// ==========================================
// TASK SCHEMAS
// ==========================================

export const generatedQuestionsOutput = Joi.object({
  questions: Joi.array()
    .items(
      Joi.object({
        prompt: Joi.string().trim().min(1).max(4_000).required(),
        expectedKeywords: Joi.array()
          .items(Joi.string().trim().min(1).max(120))
          .max(50)
          .default([]),
        difficulty: Joi.string().valid("EASY", "MEDIUM", "HARD").required(),
      }).required(),
    )
    .min(1)
    .max(50)
    .required(),
}).required();

/** Score is clamped by the service - lenient schema avoids wasted retries. */
export const evaluationOutput = Joi.object({
  score: Joi.number().required(),
  feedback: Joi.string().allow("").max(4_000).required(),
  keywordHits: Joi.array().items(Joi.string().max(120)).max(50).default([]),
}).required();

export const descriptionOutput = Joi.object({
  description: Joi.string().trim().min(1).max(4_000).required(),
  jobRequirements: Joi.string().trim().min(1).max(8_000).required(),
}).required();

// ==========================================
// WIZARD ANALYSIS SCHEMAS
// ==========================================

/** Short skill/capability token (e.g. "React", "System Design"). */
const skillToken = Joi.string().trim().min(1).max(120);
/** Bullet-length statement (responsibility, qualification, achievement). */
const bulletLine = Joi.string().trim().min(1).max(400);

const skillList = Joi.array().items(skillToken).max(40).default([]);
const bulletList = Joi.array().items(bulletLine).max(12).default([]);

/** Mirrors the client's `ExtractedJobData` (client/lib/types/jobInterview.ts). */
export const extractedJobDataOutput = Joi.object({
  roleTitle: Joi.string().trim().min(1).max(200).required(),
  company: Joi.string().trim().max(200).optional(),
  category: Joi.string().trim().max(200).optional(),
  industry: Joi.string().trim().max(200).optional(),
  experienceLevel: Joi.string().trim().max(200).optional(),
  seniority: Joi.string().trim().max(200).optional(),
  requiredSkills: skillList,
  preferredSkills: skillList,
  responsibilities: bulletList,
  qualifications: bulletList,
  technologies: skillList,
  inferredInterviewType: Joi.string().trim().max(200).optional(),
  sessionDurationMinutes: Joi.number().integer().min(15).max(180).optional(),
  extractionConfidence: Joi.string().valid("high", "medium", "low").required(),
}).required();

/** Mirrors the client's `ParsedResume`. */
export const parsedResumeOutput = Joi.object({
  candidateName: Joi.string().trim().max(200).optional(),
  currentRole: Joi.string().trim().max(200).optional(),
  experienceYears: Joi.number().min(0).max(60).optional(),
  skills: skillList,
  technologies: skillList,
  education: Joi.array().items(Joi.string().trim().min(1).max(300)).max(15).default([]),
  certifications: Joi.array().items(Joi.string().trim().min(1).max(300)).max(15).default([]),
  projects: Joi.array().items(Joi.string().trim().min(1).max(300)).max(15).default([]),
  previousCompanies: Joi.array().items(Joi.string().trim().min(1).max(200)).max(15).default([]),
  achievements: Joi.array().items(Joi.string().trim().min(1).max(300)).max(15).default([]),
}).required();

const priorityLabel = Joi.string().valid("high", "medium", "low").required();

/** Mirrors the client's `ResumeMatchAnalysis` (score clamped by the service). */
export const matchAnalysisOutput = Joi.object({
  overallScore: Joi.number().required(),
  matchLabel: Joi.string().valid("strong", "moderate", "weak").required(),
  matchedSkills: skillList,
  missingSkills: Joi.array()
    .items(
      Joi.object({
        skill: skillToken.required(),
        priority: priorityLabel,
        reason: Joi.string().trim().min(1).max(500).required(),
      }).required(),
    )
    .max(40)
    .default([]),
  experienceAlignment: Joi.object({
    summary: Joi.string().trim().max(1_000).required(),
    strengths: Joi.array().items(bulletLine).max(10).default([]),
    gaps: Joi.array().items(bulletLine).max(10).default([]),
  }).required(),
  improvementAreas: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().trim().min(1).max(200).required(),
        priority: priorityLabel,
        description: Joi.string().trim().max(500).required(),
        suggestion: Joi.string().trim().max(500).required(),
      }).required(),
    )
    .max(8)
    .default([]),
}).required();

/** The wizard's round plan, in the client's round-type vocabulary. */
export const wizardRoundsOutput = Joi.object({
  rounds: Joi.array()
    .items(
      Joi.object({
        type: Joi.string()
          .valid(...WIZARD_ROUND_TYPES)
          .required(),
        title: Joi.string().trim().min(1).max(200).required(),
        description: Joi.string().trim().max(1_000).allow("").default(""),
        estimatedDurationMinutes: Joi.number().integer().min(10).max(120).required(),
      }).required(),
    )
    .min(1)
    .max(8)
    .required(),
}).required();
