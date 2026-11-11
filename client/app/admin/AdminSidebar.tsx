"use client";

import React from "react";
import {
  Activity,
  Briefcase,
  Building2,
  ClipboardList,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import SidebarShell, { type SidebarItem } from "../components/SidebarShell";
import { HomeGridIcon, InterviewsChatIcon } from "../components/Icons";
import { useAuth } from "../components/providers/AuthProvider";

/**
 * Admin portal sidebar - same shell as the dashboard, admin nav items.
 * Items are permission-filtered client-side (RBAC-aware UI, Standards §12):
 * the server enforces the same rules, this only avoids dead-end links.
 */

const ADMIN_NAV: (SidebarItem & { minRole?: "SUPER_ADMIN" })[] = [
  { href: "/admin", label: "Overview", icon: HomeGridIcon },
  { href: "/admin/accounts", label: "Admin Accounts", icon: ShieldCheck },
  { href: "/admin/institutes", label: "Institutes", icon: Building2 },
  { href: "/admin/students", label: "Students", icon: GraduationCap },
  {
    href: "/admin/organizations",
    label: "Organizations",
    icon: Briefcase,
    minRole: "SUPER_ADMIN",
  },
  { href: "/admin/interviews", label: "Interviews", icon: InterviewsChatIcon },
  { href: "/admin/applications", label: "Applications", icon: ClipboardList },
  { href: "/admin/attempts", label: "Attempts", icon: Activity },
];

const descriptions: Record<string, string> = {
  "/admin": "Platform metrics",
  "/admin/accounts": "Roles & access",
  "/admin/institutes": "Org units & join codes",
  "/admin/students": "Accounts & activity",
  "/admin/organizations": "Orgs & LLM configs",
  "/admin/interviews": "Interview oversight",
  "/admin/applications": "Pipeline review",
  "/admin/attempts": "Attempts & scoring",
};

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function AdminSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  const { user } = useAuth();
  const role = user?.adminRole;

  const navItems = ADMIN_NAV.filter(
    (item) => !item.minRole || role === item.minRole,
  );

  return (
    <SidebarShell
      homeHref="/admin"
      exactHref="/admin"
      sectionLabel="ADMIN PANEL"
      brandSubtitle="Admin Console"
      navItems={navItems}
      descriptions={descriptions}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      isMobileOpen={isMobileOpen}
      onCloseMobile={onCloseMobile}
    />
  );
}
