import React from "react";
import { Badge, badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import type {
  ApplicationStatus,
  AttemptStatus,
} from "@/lib/api/admin";
import type { ServerInterviewStatus } from "@/lib/api/interviews";
import { ADMIN_ROLE_BADGES } from "@/lib/adminRole";
import { cn } from "@/lib/utils";

/**
 * Status chips for the admin tables (Standards §5: one consistent visual
 * language for enum statuses). The per-domain maps below are the single
 * source of truth for how each status renders.
 */

export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export function humanizeStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface StatusBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}

export function StatusBadge({
  variant = "soft",
  children,
  className,
  testId,
}: StatusBadgeProps) {
  return (
    <Badge variant={variant} className={cn("font-semibold", className)} data-testid={testId}>
      {children}
    </Badge>
  );
}

type StatusStyle = { variant: BadgeVariant };

export const INTERVIEW_STATUS_STYLES: Record<ServerInterviewStatus, StatusStyle> = {
  DRAFT: { variant: "secondary" },
  ACTIVE: { variant: "info" },
  COMPLETED: { variant: "success" },
  ARCHIVED: { variant: "outline" },
};

export const APPLICATION_STATUS_STYLES: Record<ApplicationStatus, StatusStyle> = {
  APPLIED: { variant: "info" },
  SHORTLISTED: { variant: "warning" },
  INTERVIEWED: { variant: "soft" },
  REJECTED: { variant: "danger" },
};

export const ATTEMPT_STATUS_STYLES: Record<AttemptStatus, StatusStyle> = {
  IN_PROGRESS: { variant: "warning" },
  COMPLETED: { variant: "success" },
  EVALUATED: { variant: "info" },
};

/** Role chip styling (same table chip the topbar uses). */
export function roleBadgeVariant(role: string | undefined): BadgeVariant {
  return role ? ADMIN_ROLE_BADGES[role as keyof typeof ADMIN_ROLE_BADGES] ?? "soft" : "soft";
}
