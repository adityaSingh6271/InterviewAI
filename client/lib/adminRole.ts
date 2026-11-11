import type { AdminRole } from "@/lib/api/admin";

/**
 * Presentation helpers for admin roles (RBAC-aware UI, Standards §12):
 * one place for the human labels + the chip styling so the role reads the
 * same in the topbar, tables, and forms.
 */

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Organization Admin",
  INSTITUTE_ADMIN: "Institute Admin",
};

/** Short topbar variant (space-constrained). */
export const ADMIN_ROLE_SHORT_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Org Admin",
  INSTITUTE_ADMIN: "Institute Admin",
};

/** Badge chip variant per role (see components/ui/badge.tsx). */
export const ADMIN_ROLE_BADGES: Record<AdminRole, "danger" | "warning" | "soft"> = {
  SUPER_ADMIN: "danger",
  ORG_ADMIN: "warning",
  INSTITUTE_ADMIN: "soft",
};

export function adminRoleLabel(role: string | undefined): string {
  return role && role in ADMIN_ROLE_LABELS
    ? ADMIN_ROLE_LABELS[role as AdminRole]
    : "Administrator";
}

export function adminRoleBadge(role: string | undefined) {
  return role && role in ADMIN_ROLE_BADGES
    ? ADMIN_ROLE_BADGES[role as AdminRole]
    : "soft";
}

/** Rank for client-side affordance ordering (mirrors server ROLE_RANK). */
export function adminRoleRank(role: string | undefined): number {
  switch (role) {
    case "SUPER_ADMIN":
      return 3;
    case "ORG_ADMIN":
      return 2;
    case "INSTITUTE_ADMIN":
      return 1;
    default:
      return 0;
  }
}
