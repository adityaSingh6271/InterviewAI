import { ApiRequestError } from "./errors";
import { tokenStore } from "./tokenStore";
import type { ApiEnvelope, ApiResult, AuthSession, PaginationMeta } from "./types";

/**
 * Core fetch wrapper for the Express API (proxied same-origin under
 * /api/v1). Responsibilities:
 *
 * - JSON encoding/decoding and the { success, data | error } envelope
 * - Attaches `Authorization: Bearer <token>` when a token is in memory
 * - `credentials: "include"` so the httpOnly refresh cookie is sent
 * - Single-flight refresh-on-401: concurrent 401s share one
 *   /auth/refresh-token call, then the original request is retried once
 * - Throws ApiRequestError (with stable code + field details) on failure
 */

function resolveApiBase(rawValue: string | undefined): string {
  const cleaned = (rawValue ?? "").trim().replace(/\/+$/, "");
  if (!cleaned) return "/api/v1";
  return cleaned.endsWith("/api/v1") ? cleaned : `${cleaned}/api/v1`;
}

const API_BASE = resolveApiBase(process.env.NEXT_PUBLIC_API_BASE_URL);

/** Endpoints that must not trigger the refresh-retry (they ARE the auth). */
const NO_REFRESH_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh-token",
  "/auth/logout",
]);

/** Body types accepted by apiFetch. FormData is sent as-is (multipart). */
type RequestBody = Record<string, unknown> | unknown[] | FormData | undefined;

let refreshPromise: Promise<string | null> | null = null;

/**
 * Exchange the httpOnly refresh cookie for a fresh access token. Single-flight:
 * parallel callers await the same in-flight request (the refresh token rotates
 * on use, so parallel refreshes would invalidate each other).
 */
export function refreshSession(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(): Promise<string | null> {
  try {
    const rt = tokenStore.getRefreshToken();
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rt ? { refreshToken: rt } : {}),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiEnvelope<AuthSession>;
    if (!body.success) return null;
    tokenStore.set(body.data.accessToken, body.data.refreshToken);
    return body.data.accessToken;
  } catch {
    return null;
  }
}


interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: RequestBody;
  /** Query string params; undefined/null values are omitted. */
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  /** Skip the automatic refresh-and-retry on 401 (used by auth flows). */
  skipAuthRetry?: boolean;
}

function buildUrl(path: string, query?: ApiFetchOptions["query"]): string {
  const url = `${API_BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function toApiError(res: Response): Promise<ApiRequestError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON error body (proxy hiccup, HTML error page, ...)
  }
  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    body.success === false &&
    "error" in body &&
    body.error &&
    typeof body.error === "object"
  ) {
    return new ApiRequestError(res.status, body.error as ApiRequestErrorBody);
  }
  return new ApiRequestError(res.status, {
    code: `HTTP_${res.status}`,
    message: res.statusText || "Unexpected server response",
  });
}

type ApiRequestErrorBody = { code: string; message: string; details?: { field?: string; message: string }[] };

/**
 * Perform an API request and return the unwrapped `data` (plus pagination
 * `meta` when present). Throws ApiRequestError on any failure.
 */
export async function apiFetch<T, M = PaginationMeta>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiResult<T, M>> {
  const { method = "GET", body, query, signal, skipAuthRetry } = options;
  const url = buildUrl(path, query);

  const doRequest = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    // FormData must keep its own multipart boundary header.
    const isFormData = body instanceof FormData;
    if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(url, {
      method,
      credentials: "include",
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal,
    });
  };

  let res = await doRequest(tokenStore.get());

  // Expired/missing access token: refresh once (shared across concurrent
  // callers), then retry the original request with the new token.
  if (res.status === 401 && !skipAuthRetry && !NO_REFRESH_PATHS.has(path)) {
    const freshToken = await refreshSession();
    if (freshToken) {
      res = await doRequest(freshToken);
    } else {
      tokenStore.clear();
    }
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return { data: undefined as T };

  const json = (await res.json()) as ApiEnvelope<T>;
  if (!json.success) {
    throw new ApiRequestError(res.status, json.error);
  }
  // `meta` is PaginationMeta for list endpoints but some endpoints attach a
  // different verdict object (e.g. attempt submit's evaluation meta) - the
  // caller's `M` type argument describes what this endpoint actually sends.
  return { data: json.data, meta: json.meta as M | undefined };
}
