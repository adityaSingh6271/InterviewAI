import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../../api/types";
import { tokenStore } from "../../api/tokenStore";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AccessControl {
  role: "STUDENT" | "INSTITUTE_ADMIN" | "ORG_ADMIN" | "SUPER_ADMIN" | "ANONYMOUS";
  rank: number;
  portal: "student" | "admin" | null;
  instituteId: string | null;
  // Specific capabilities:
  canManageOrganizations: boolean; // Only SUPER_ADMIN
  canManageAllInstitutes: boolean; // Only SUPER_ADMIN
  canManageOwnOrganizationInstitutes: boolean; // ORG_ADMIN, SUPER_ADMIN
  canManageStudents: boolean; // Any admin
  canManageInterviews: boolean; // Any admin
  canManageAdmins: boolean; // Any admin (scoped to <= own rank)
  canViewAllAdminRoles: boolean; // Only SUPER_ADMIN
  allowedAdminRoles: ("INSTITUTE_ADMIN" | "ORG_ADMIN" | "SUPER_ADMIN")[];
  scope: "GLOBAL" | "ORGANIZATION" | "INSTITUTE" | "STUDENT" | "NONE";
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: AuthStatus;
  accessControl: AccessControl;
}

const USER_DATA_KEY = "interview_ai_user";

export function computeAccessControl(user: User | null): AccessControl {
  if (!user) {
    return {
      role: "ANONYMOUS",
      rank: 0,
      portal: null,
      instituteId: null,
      canManageOrganizations: false,
      canManageAllInstitutes: false,
      canManageOwnOrganizationInstitutes: false,
      canManageStudents: false,
      canManageInterviews: false,
      canManageAdmins: false,
      canViewAllAdminRoles: false,
      allowedAdminRoles: [],
      scope: "NONE",
    };
  }

  if (user.portal === "student") {
    return {
      role: "STUDENT",
      rank: 0,
      portal: "student",
      instituteId: user.instituteId,
      canManageOrganizations: false,
      canManageAllInstitutes: false,
      canManageOwnOrganizationInstitutes: false,
      canManageStudents: false,
      canManageInterviews: false,
      canManageAdmins: false,
      canViewAllAdminRoles: false,
      allowedAdminRoles: [],
      scope: "STUDENT",
    };
  }

  const role = user.adminRole;
  if (role === "SUPER_ADMIN") {
    return {
      role: "SUPER_ADMIN",
      rank: 3,
      portal: "admin",
      instituteId: user.instituteId,
      canManageOrganizations: true,
      canManageAllInstitutes: true,
      canManageOwnOrganizationInstitutes: true,
      canManageStudents: true,
      canManageInterviews: true,
      canManageAdmins: true,
      canViewAllAdminRoles: true,
      allowedAdminRoles: ["INSTITUTE_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"],
      scope: "GLOBAL",
    };
  }

  if (role === "ORG_ADMIN") {
    return {
      role: "ORG_ADMIN",
      rank: 2,
      portal: "admin",
      instituteId: user.instituteId,
      canManageOrganizations: false,
      canManageAllInstitutes: false,
      canManageOwnOrganizationInstitutes: true,
      canManageStudents: true,
      canManageInterviews: true,
      canManageAdmins: true,
      canViewAllAdminRoles: false,
      allowedAdminRoles: ["INSTITUTE_ADMIN", "ORG_ADMIN"],
      scope: "ORGANIZATION",
    };
  }

  // INSTITUTE_ADMIN (default for admin)
  return {
    role: "INSTITUTE_ADMIN",
    rank: 1,
    portal: "admin",
    instituteId: user.instituteId,
    canManageOrganizations: false,
    canManageAllInstitutes: false,
    canManageOwnOrganizationInstitutes: false,
    canManageStudents: true,
    canManageInterviews: true,
    canManageAdmins: true,
    canViewAllAdminRoles: false,
    allowedAdminRoles: ["INSTITUTE_ADMIN"],
    scope: "INSTITUTE",
  };
}

/** Safely read persisted user from localStorage */
export const getPersistedUser = (): User | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_DATA_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

/** Safely write or remove persisted user in localStorage */
export const persistUser = (user: User | null): void => {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_DATA_KEY);
    }
  } catch {}
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  status: "loading",
  accessControl: computeAccessControl(null),
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        accessToken: string;
        refreshToken?: string;
      }>,
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = "authenticated";
      state.accessControl = computeAccessControl(action.payload.user);
      tokenStore.set(action.payload.accessToken, action.payload.refreshToken);
      persistUser(action.payload.user);
    },

    rehydrateAuth: (
      state,
      action: PayloadAction<{
        user: User;
        accessToken?: string | null;
      }>,
    ) => {
      state.user = action.payload.user;
      if (action.payload.accessToken) {
        state.accessToken = action.payload.accessToken;
      }
      state.status = "authenticated";
      state.accessControl = computeAccessControl(action.payload.user);
    },

    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        state.accessControl = computeAccessControl(state.user);
        persistUser(state.user);
      }
    },

    setAuthStatus: (state, action: PayloadAction<AuthStatus>) => {
      state.status = action.payload;
    },

    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.status = "anonymous";
      state.accessControl = computeAccessControl(null);
      tokenStore.clear();
      persistUser(null);
    },
  },
});

export const {
  setCredentials,
  rehydrateAuth,
  updateUser,
  setAuthStatus,
  clearCredentials,
} = authSlice.actions;

export default authSlice.reducer;
