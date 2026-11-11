import { instituteRepository } from "../repositories/institute.repository";
import { llmConfigRepository } from "../repositories/llm-config.repository";
import { ERROR_CODES } from "../constants/error-codes";
import { AppError } from "../utils/app-error.util";
import { decryptSecret } from "../utils/encryption.util";
import type { ResolvedLlmConfig } from "./client";

/**
 * Turns a tenancy scope into a ready-to-use LLM config.
 *
 * Path: instituteId -> organizationId -> the org's active
 * `organization_llm_configs` row -> AES-GCM decrypt (in memory only).
 * Anything missing answers 503 `AI_NOT_CONFIGURED` with an actionable
 * message - never an internal error.
 *
 * `settings` (JSONB on the config row) carries optional overrides:
 *   baseUrl    - provider endpoint (defaults per provider, OpenAI otherwise)
 *   temperature, maxTokens, timeoutMs - generation knobs
 */

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_TOKENS = 1600;
const DEFAULT_TIMEOUT_MS = 30_000;

/** Per-provider defaults for the OpenAI-compatible adapter. */
const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  google: "https://generativelanguage.googleapis.com/v1beta/openai",
  ollama: "http://localhost:11434/v1",
  lmstudio: "http://localhost:1234/v1",
};

/** Ordered fallback models per provider (current active models first). */
const PROVIDER_FALLBACK_MODELS: Record<string, string[]> = {
  groq: ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"],
  openai: ["gpt-4o-mini", "gpt-4.1-mini"],
  gemini: ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.7-flash"],
  google: ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.7-flash"],
};

function notConfigured(): AppError {
  return AppError.serviceUnavailable(
    "No active LLM configuration for your organization - ask a super administrator to add and activate one",
    ERROR_CODES.AI_NOT_CONFIGURED,
  );
}

function positiveNumber(value: unknown, fallback: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(value, max)
    : fallback;
}

function isPlaceholderKey(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return (
    !trimmed ||
    trimmed.startsWith("gsk_interviewai") ||
    trimmed.startsWith("gsk_placeholder") ||
    trimmed.startsWith("sk-placeholder") ||
    trimmed === "placeholder" ||
    trimmed.length < 15
  );
}

function pushCandidate(
  candidates: ResolvedLlmConfig[],
  seen: Set<string>,
  candidate: ResolvedLlmConfig,
): void {
  const key = `${candidate.provider.trim().toLowerCase()}::${candidate.baseUrl}::${candidate.modelName}::${candidate.apiKey}`;
  if (seen.has(key)) return;
  seen.add(key);
  candidates.push(candidate);
}

function pushProviderModels(
  candidates: ResolvedLlmConfig[],
  seen: Set<string>,
  base: Omit<ResolvedLlmConfig, "modelName">,
  models: Array<string | undefined>,
): void {
  for (const model of models) {
    const trimmed = model?.trim();
    if (!trimmed) continue;
    pushCandidate(candidates, seen, { ...base, modelName: trimmed });
  }
}

/**
 * Resolve all candidate LLM configs for the tenant `instituteId` belongs to,
 * ordered by priority (valid org DB config -> active env providers -> stored
 * fallback). Enables callers to fail over across models/providers when an
 * upstream model is deprecated or out of quota.
 *
 * @throws AppError 503 `AI_NOT_CONFIGURED` when no active config exists or
 *                  the institute's organization cannot be resolved.
 */
export async function resolveLlmConfigsForInstitute(
  instituteId: string,
): Promise<ResolvedLlmConfig[]> {
  const envGroq = process.env.GROQ_API_KEY?.trim();
  const envOpenAI = process.env.OPENAI_API_KEY?.trim();
  const envGemini = process.env.GEMINI_API_KEY?.trim();

  const organizationId = await instituteRepository.findOrganizationId(instituteId);
  const dbConfig = organizationId
    ? await llmConfigRepository.findActiveKeyForOrganization(organizationId)
    : null;

  const storedKey = dbConfig ? decryptSecret(dbConfig.apiKeyEncrypted).trim() : "";
  const isStoredPlaceholder = isPlaceholderKey(storedKey);

  const candidates: ResolvedLlmConfig[] = [];
  const seen = new Set<string>();

  const buildDbCandidates = () => {
    if (!dbConfig) return;
    const settings = (dbConfig.settings ?? {}) as Record<string, unknown>;
    const provider = dbConfig.provider.trim().toLowerCase();
    const baseUrl =
      typeof settings.baseUrl === "string" && settings.baseUrl.trim().length > 0
        ? settings.baseUrl.trim()
        : PROVIDER_BASE_URLS[provider] ?? DEFAULT_BASE_URL;

    pushProviderModels(
      candidates,
      seen,
      {
        provider: dbConfig.provider,
        apiKey: storedKey,
        baseUrl,
        temperature: positiveNumber(settings.temperature, DEFAULT_TEMPERATURE, 2),
        maxTokens: positiveNumber(settings.maxTokens, DEFAULT_MAX_TOKENS, 32_000),
        timeoutMs: positiveNumber(settings.timeoutMs, DEFAULT_TIMEOUT_MS, 120_000),
      },
      [dbConfig.modelName, ...(PROVIDER_FALLBACK_MODELS[provider] ?? [])],
    );
  };

  // Prefer real, non-placeholder DB configuration first.
  if (dbConfig && !isStoredPlaceholder) {
    buildDbCandidates();
  }

  // Real active keys from environment (Groq > Gemini > OpenAI).
  const envProviders: Array<{ provider: string; apiKey: string | undefined; envModel: string | undefined }> = [
    { provider: "groq", apiKey: envGroq, envModel: process.env.GROQ_MODEL },
    { provider: "gemini", apiKey: envGemini, envModel: process.env.GEMINI_MODEL },
    { provider: "openai", apiKey: envOpenAI, envModel: process.env.OPENAI_MODEL },
  ];

  for (const entry of envProviders) {
    if (isPlaceholderKey(entry.apiKey)) continue;
    pushProviderModels(
      candidates,
      seen,
      {
        provider: entry.provider,
        apiKey: entry.apiKey!,
        baseUrl: PROVIDER_BASE_URLS[entry.provider] ?? DEFAULT_BASE_URL,
        temperature: DEFAULT_TEMPERATURE,
        maxTokens: DEFAULT_MAX_TOKENS,
        timeoutMs: DEFAULT_TIMEOUT_MS,
      },
      [entry.envModel, ...(PROVIDER_FALLBACK_MODELS[entry.provider] ?? [])],
    );
  }

  if (dbConfig && candidates.length === 0) {
    buildDbCandidates();
  }

  if (candidates.length === 0) {
    throw notConfigured();
  }

  return candidates;
}

/**
 * Resolve the primary active LLM config for the tenant `instituteId` belongs to.
 *
 * @throws AppError 503 `AI_NOT_CONFIGURED` when no active config exists or
 *                  the institute's organization cannot be resolved.
 */
export async function resolveLlmConfigForInstitute(
  instituteId: string,
): Promise<ResolvedLlmConfig> {
  const candidates = await resolveLlmConfigsForInstitute(instituteId);
  return candidates[0]!;
}

/**
 * Resolve Whisper-compatible audio transcription candidates (Groq Whisper /
 * OpenAI Whisper) for the institute.
 */
export async function resolveTranscriptionConfigsForInstitute(
  instituteId: string,
): Promise<ResolvedLlmConfig[]> {
  const candidates: ResolvedLlmConfig[] = [];
  const seen = new Set<string>();

  const organizationId = await instituteRepository.findOrganizationId(instituteId);
  const dbConfig = organizationId
    ? await llmConfigRepository.findActiveKeyForOrganization(organizationId)
    : null;
  const storedKey = dbConfig ? decryptSecret(dbConfig.apiKeyEncrypted).trim() : "";

  if (dbConfig && !isPlaceholderKey(storedKey)) {
    const provider = dbConfig.provider.trim().toLowerCase();
    if (provider === "groq" || provider === "openai") {
      const models =
        provider === "groq"
          ? ["whisper-large-v3-turbo", "whisper-large-v3"]
          : ["whisper-1"];
      pushProviderModels(
        candidates,
        seen,
        {
          provider,
          apiKey: storedKey,
          baseUrl: PROVIDER_BASE_URLS[provider] ?? DEFAULT_BASE_URL,
          temperature: 0,
          maxTokens: 1000,
          timeoutMs: DEFAULT_TIMEOUT_MS,
        },
        models,
      );
    }
  }

  const envGroq = process.env.GROQ_API_KEY?.trim();
  if (!isPlaceholderKey(envGroq)) {
    pushProviderModels(
      candidates,
      seen,
      {
        provider: "groq",
        apiKey: envGroq!,
        baseUrl: PROVIDER_BASE_URLS.groq!,
        temperature: 0,
        maxTokens: 1000,
        timeoutMs: DEFAULT_TIMEOUT_MS,
      },
      ["whisper-large-v3-turbo", "whisper-large-v3"],
    );
  }

  const envOpenAI = process.env.OPENAI_API_KEY?.trim();
  if (!isPlaceholderKey(envOpenAI)) {
    pushProviderModels(
      candidates,
      seen,
      {
        provider: "openai",
        apiKey: envOpenAI!,
        baseUrl: PROVIDER_BASE_URLS.openai!,
        temperature: 0,
        maxTokens: 1000,
        timeoutMs: DEFAULT_TIMEOUT_MS,
      },
      ["whisper-1"],
    );
  }

  if (candidates.length === 0) {
    throw notConfigured();
  }
  return candidates;
}
