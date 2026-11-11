import { apiFetch, refreshSession } from "./client";
import { isApiError } from "./errors";
import { tokenStore } from "./tokenStore";
import type { AccessControl, AuthSession, User } from "./types";

/**
 * Auth API calls (server/src/routes/auth.routes.ts).
 *
 * This client is the student portal: register only accepts
 * `portal: "student"` and login always tries it first. Per the Step-3
 * decision, a seeded admin account may also sign in here to exercise the
 * admin-only affordances until the separate admin portal ships - so a
 * rejected student login is retried once against the admin table. The
 * returned session carries `user.portal`, which drives role-aware UI.
 *
 * The refresh token lives in an httpOnly cookie (Path=/api/v1/auth), so every
 * call here relies on `credentials: "include"` (handled by apiFetch).
 */

/** POST /auth/login against one portal's credential table. */
async function loginWithPortal(
  portal: "student" | "admin",
  input: { email: string; password: string },
): Promise<AuthSession> {
  const { data } = await apiFetch<AuthSession>("/auth/login", {
    method: "POST",
    body: { portal, ...input },
    skipAuthRetry: true,
  });
  tokenStore.set(data.accessToken, data.refreshToken);
  return data;
}

export const authApi = {
  /** Student self-registration. Sets the access token on success. */
  async register(input: {
    name: string;
    email: string;
    password: string;
    instituteCode: string;
  }): Promise<AuthSession> {
    const { data } = await apiFetch<AuthSession>("/auth/register", {
      method: "POST",
      body: { portal: "student", ...input },
      skipAuthRetry: true,
    });
    tokenStore.set(data.accessToken, data.refreshToken);
    return data;
  },

  /**
   * Login: attempts specified portal if provided, otherwise student first then admin.
   */
  async login(input: {
    email: string;
    password: string;
    portal?: "student" | "admin";
  }): Promise<AuthSession> {
    if (input.portal) {
      return loginWithPortal(input.portal, { email: input.email, password: input.password });
    }
    try {
      return await loginWithPortal("student", input);
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        return loginWithPortal("admin", input);
      }
      throw error;
    }
  },

  /**
   * Session bootstrap: Checks if an access token is already available
   * and valid via /auth/me. If expired or absent, attempts refresh token exchange.
   * Returns null if anonymous without firing unnecessary 401 errors.
   */
  async getSession(): Promise<AuthSession | null> {
    const token = tokenStore.get();
    if (token) {
      try {
        const { data } = await apiFetch<{ user: User }>("/auth/me", {
          skipAuthRetry: true,
        });
        return {
          user: data.user,
          accessToken: token,
          refreshToken: tokenStore.getRefreshToken() || undefined,
        };
      } catch {
        // Access token likely expired, continue to refresh
      }
    }
    const rt = tokenStore.getRefreshToken();
    if (!token && !rt) {
      // Anonymous state: no tokens stored
      return null;
    }
    return this.refresh();
  },

  /**
   * Session recovery: rotates the refresh token for a new access token,
   * then loads the current user. Returns null when there is no (valid)
   * refresh token - that is the anonymous state, not an error.
   */
  async refresh(): Promise<AuthSession | null> {
    const token = await refreshSession();
    if (!token) return null;
    const { data } = await apiFetch<{ user: User }>("/auth/me");
    return {
      user: data.user,
      accessToken: token,
      refreshToken: tokenStore.getRefreshToken() || undefined,
    };
  },


  /**
   * Current authenticated user identity (/auth/me).
   */
  async me(): Promise<{ user: User }> {
    const { data } = await apiFetch<{ user: User }>("/auth/me");
    return data;
  },

  /**
   * Explicit RBAC permissions and capabilities (/auth/rbac).
   */
  async getRbac(): Promise<AccessControl> {
    const { data } = await apiFetch<AccessControl>("/auth/rbac");
    return data;
  },

  /** Revoke the session server-side and clear the cookie + local token. */
  async logout(): Promise<void> {
    try {
      await apiFetch<null>("/auth/logout", {
        method: "POST",
        skipAuthRetry: true,
      });
    } finally {
      tokenStore.clear();
    }
  },
};
