"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { queryKeys } from "@/lib/api/queryKeys";
import { tokenStore } from "@/lib/api/tokenStore";
import type { AuthSession, User } from "@/lib/api/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  setCredentials,
  rehydrateAuth,
  clearCredentials,
  getPersistedUser,
  type AuthStatus,
} from "@/lib/redux/slices/authSlice";

interface LoginInput {
  email: string;
  password: string;
  portal?: "student" | "admin";
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  instituteCode: string;
}

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<AuthSession>;
  register: (input: RegisterInput) => Promise<AuthSession>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const reduxAuth = useAppSelector((state) => state.auth);

  // Immediately rehydrate persisted user from localStorage into Redux on mount
  useEffect(() => {
    const persisted = getPersistedUser();
    const token = tokenStore.get();
    if (persisted && !reduxAuth.user) {
      dispatch(rehydrateAuth({ user: persisted, accessToken: token }));
    }
  }, [dispatch, reduxAuth.user]);

  // Session query: recovers or validates the session on load
  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => authApi.getSession(),
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity,
  });

  // Sync session query results to Redux store
  useEffect(() => {
    if (sessionQuery.data) {
      dispatch(setCredentials(sessionQuery.data));
    } else if (sessionQuery.isFetched && !sessionQuery.data && !tokenStore.get()) {
      dispatch(clearCredentials());
    }
  }, [sessionQuery.data, sessionQuery.isFetched, dispatch]);

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (session) => {
      dispatch(setCredentials(session));
      queryClient.setQueryData(queryKeys.auth.me, session);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (session) => {
      dispatch(setCredentials(session));
      queryClient.setQueryData(queryKeys.auth.me, session);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      dispatch(clearCredentials());
      tokenStore.clear();
      queryClient.setQueryData(queryKeys.auth.me, null);
    },
  });

  const login = useCallback(
    (input: LoginInput) => loginMutation.mutateAsync(input),
    [loginMutation],
  );

  const register = useCallback(
    (input: RegisterInput) => registerMutation.mutateAsync(input),
    [registerMutation],
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const value = useMemo<AuthContextValue>(() => {
    const user = reduxAuth.user ?? sessionQuery.data?.user ?? null;
    let status: AuthStatus = "anonymous";

    if (sessionQuery.isLoading && !user) {
      status = "loading";
    } else if (user) {
      status = "authenticated";
    } else {
      status = "anonymous";
    }

    return { user, status, login, register, logout };
  }, [reduxAuth.user, sessionQuery.data, sessionQuery.isLoading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the auth session. Throws outside of <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
