import { logger } from "../config/logger";
import { AppError } from "../utils/app-error.util";

/**
 * LLM transport (OpenAI-compatible Chat Completions).
 *
 * One adapter speaks to every provider that exposes
 * `POST {baseUrl}/chat/completions` with Bearer auth - OpenAI, Groq,
 * OpenRouter, Ollama, LM Studio, and most proxies. The base URL comes from
 * `settings.baseUrl` or a provider default (see `resolve.ts`).
 *
 * Guarantees:
 * - the decrypted API key exists only inside this module's request headers
 *   and is never included in an error, log line, or returned payload;
 * - every failure becomes a documented AppError (502 upstream / 504 timeout)
 *   with a stable AI_* error code - a provider outage never surfaces as a
 *   generic 500;
 * - transient failures (network, 429, 5xx) are retried exactly once;
 * - JSON output discipline lives in `validators.ts` (strict prompt + parse +
 *   one corrective retry), deliberately NOT via `response_format`: that flag
 *   is rejected by several compatible providers, and prompt-enforced JSON
 *   works everywhere including local models.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** In-memory config - `apiKey` is plaintext and never persisted or logged. */
export type ResolvedLlmConfig = {
  provider: string;
  modelName: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
};

export type CompleteOptions = {
  messages: ChatMessage[];
  /** Per-call override of the config's default caps. */
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};

const MAX_ATTEMPTS = 2; // 1 initial + 1 transient retry
const RETRY_DELAY_MS = 400;
const MAX_RETRY_AFTER_MS = 2_000; // longer Retry-After is surfaced, not slept

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ProviderFailure = { status: number; retryAfterMs?: number };

function isTransient(status: number): boolean {
  return status === 429 || status >= 500;
}

function mapFailure(status: number): AppError {
  if (status === 401 || status === 403) {
    return AppError.badGateway(
      "The LLM provider rejected the stored API key - update it in the organization's LLM config",
    );
  }
  if (status === 404) {
    return AppError.badGateway("The configured LLM model was not found by the provider");
  }
  return AppError.badGateway("The LLM provider could not complete the request");
}

/** Perform one HTTP call; transient/network problems come back typed. */
async function postOnce(
  config: ResolvedLlmConfig,
  body: string,
  timeoutMs: number,
): Promise<{ ok: true; text: string } | { ok: false; failure: ProviderFailure } | { ok: false; timeout: true } | { ok: false; network: true }> {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    if (name === "TimeoutError" || name === "AbortError") return { ok: false, timeout: true };
    return { ok: false, network: true };
  }

  if (!response.ok) {
    // Provider bodies can echo request details - read for logs, never forward.
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    const retryAfter = Number(response.headers.get("retry-after"));
    logger.warn("LLM provider request failed", {
      provider: config.provider,
      model: config.modelName,
      status: response.status,
      detail,
    });
    return {
      ok: false,
      failure: {
        status: response.status,
        retryAfterMs:
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined,
      },
    };
  }

  return { ok: true, text: await response.text() };
}

/**
 * Request one chat completion and return the assistant's text content.
 *
 * @throws AppError 502 (`AI_UPSTREAM_ERROR`) on provider failures,
 *                  504 (`AI_TIMEOUT`) when the provider does not answer
 *                  within `timeoutMs`.
 */
export async function complete(
  config: ResolvedLlmConfig,
  options: CompleteOptions,
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? config.timeoutMs;
  const body = JSON.stringify({
    model: config.modelName,
    messages: options.messages,
    temperature: options.temperature ?? config.temperature,
    max_tokens: options.maxTokens ?? config.maxTokens,
  });

  for (let attempt = 1; ; attempt += 1) {
    const result = await postOnce(config, body, timeoutMs);

    if (result.ok) {
      return extractContent(config, result.text);
    }
    if ("timeout" in result) {
      throw AppError.gatewayTimeout("The LLM provider did not answer in time");
    }
    if ("network" in result) {
      if (attempt >= MAX_ATTEMPTS) {
        throw AppError.badGateway("Could not reach the LLM provider");
      }
      await sleep(RETRY_DELAY_MS);
      continue;
    }

    // Non-transient provider rejection: fail immediately with a mapped error.
    if (!isTransient(result.failure.status)) {
      throw mapFailure(result.failure.status);
    }
    if (attempt >= MAX_ATTEMPTS) {
      throw mapFailure(result.failure.status);
    }
    const wait = Math.min(result.failure.retryAfterMs ?? RETRY_DELAY_MS, MAX_RETRY_AFTER_MS);
    await sleep(wait);
  }
}

/** Parse the OpenAI-shaped envelope; malformed JSON becomes AI_UPSTREAM_ERROR. */
function extractContent(config: ResolvedLlmConfig, raw: string): string {
  let content: unknown;
  try {
    content = (JSON.parse(raw) as { choices?: Array<{ message?: { content?: unknown } }> })
      .choices?.[0]?.message?.content;
  } catch {
    logger.warn("LLM provider returned non-JSON envelope", {
      provider: config.provider,
      model: config.modelName,
    });
    throw AppError.badGateway("The LLM provider returned an unusable response");
  }
  if (typeof content !== "string" || content.trim().length === 0) {
    logger.warn("LLM provider returned an empty completion", {
      provider: config.provider,
      model: config.modelName,
    });
    throw AppError.badGateway("The LLM provider returned an unusable response");
  }
  return content;
}

/**
 * Transcribe an audio clip via OpenAI-compatible `/audio/transcriptions`
 * (Groq `whisper-large-v3-turbo` / OpenAI `whisper-1`), failing over across
 * candidates on upstream errors.
 */
export async function transcribeAudio(
  configs: ResolvedLlmConfig[],
  file: { buffer: Buffer; originalname: string; mimetype: string },
): Promise<string> {
  let lastError: unknown;

  for (let idx = 0; idx < configs.length; idx += 1) {
    const config = configs[idx]!;
    try {
      const form = new FormData();
      const blob = new Blob([new Uint8Array(file.buffer)], {
        type: file.mimetype || "audio/webm",
      });
      form.append("file", blob, file.originalname || "answer.webm");
      form.append("model", config.modelName);
      form.append("language", "en");
      form.append("temperature", "0");
      form.append("response_format", "verbose_json");

      const response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/audio/transcriptions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
        },
        body: form,
        signal: AbortSignal.timeout(config.timeoutMs),
      });

      if (!response.ok) {
        const detail = (await response.text().catch(() => "")).slice(0, 300);
        logger.warn("Audio transcription request failed", {
          provider: config.provider,
          model: config.modelName,
          status: response.status,
          detail,
        });
        throw mapFailure(response.status);
      }

      const json = (await response.json()) as {
        text?: unknown;
        segments?: Array<{ no_speech_prob?: number }>;
      };
      const segments = Array.isArray(json.segments) ? json.segments : [];
      if (
        segments.length > 0 &&
        segments.every((seg) => typeof seg.no_speech_prob === "number" && seg.no_speech_prob > 0.78)
      ) {
        return "";
      }
      const text = typeof json.text === "string" ? json.text.trim() : "";
      return text;
    } catch (error) {
      lastError = error;
      if (idx === configs.length - 1) {
        if (error instanceof AppError) throw error;
        throw AppError.badGateway("Audio transcription service could not complete the request");
      }
    }
  }

  if (lastError instanceof AppError) throw lastError;
  throw AppError.badGateway("Audio transcription service could not complete the request");
}
