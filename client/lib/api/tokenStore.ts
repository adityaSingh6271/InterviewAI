/**
 * Token store for JWT access token and refresh token.
 * Persists to localStorage with in-memory caching for resilience across page reloads.
 */
const ACCESS_TOKEN_KEY = "interview_ai_access_token";
const REFRESH_TOKEN_KEY = "interview_ai_refresh_token";

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

export const tokenStore = {
  get(): string | null {
    if (inMemoryAccessToken) return inMemoryAccessToken;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (stored) {
          inMemoryAccessToken = stored;
          return stored;
        }
      } catch {
        // storage disabled or unavailable
      }
    }
    return null;
  },

  getRefreshToken(): string | null {
    if (inMemoryRefreshToken) return inMemoryRefreshToken;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (stored) {
          inMemoryRefreshToken = stored;
          return stored;
        }
      } catch {}
    }
    return null;
  },

  set(token: string, refreshToken?: string): void {
    inMemoryAccessToken = token;
    if (refreshToken) inMemoryRefreshToken = refreshToken;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        if (refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }
      } catch {}
    }
  },

  setRefreshToken(refreshToken: string): void {
    inMemoryRefreshToken = refreshToken;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } catch {}
    }
  },

  clear(): void {
    inMemoryAccessToken = null;
    inMemoryRefreshToken = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      } catch {}
    }
  },
};

