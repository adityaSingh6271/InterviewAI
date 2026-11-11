"use client";

import React from "react";
import SidebarShell, { type SidebarItem } from "./SidebarShell";
import {
  AnalyticsBarIcon,
  HelpCircleIcon,
  HomeGridIcon,
  InterviewsChatIcon,
  SettingsSlidersIcon,
  UserCircleIcon,
} from "./Icons";

/**
 * Student dashboard sidebar - a thin wrapper over the shared shell with the
 * dashboard's nav items (the visuals/behavior live in SidebarShell so the
 * admin portal reuses the exact same pattern).
 */

const navItems: SidebarItem[] = [
  { href: "/dashboard", label: "Home", icon: HomeGridIcon },
  {
    href: "/dashboard/interviews",
    label: "Interviews",
    icon: InterviewsChatIcon,
  },
  { href: "/dashboard/analytics", label: "Analytics", icon: AnalyticsBarIcon },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircleIcon },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsSlidersIcon },
];

const bottomItems: SidebarItem[] = [
  { href: "/dashboard/help", label: "Help Center", icon: HelpCircleIcon },
];

const descriptions: Record<string, string> = {
  "/dashboard": "Dashboard & progress",
  "/dashboard/interviews": "Simulation workspaces",
  "/dashboard/analytics": "Performance & insights",
  "/dashboard/profile": "Candidate & skills",
  "/dashboard/settings": "Preferences & API keys",
  "/dashboard/help": "Guides & FAQs",
};

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <SidebarShell
      homeHref="/dashboard"
      exactHref="/dashboard"
      navItems={navItems}
      bottomItems={bottomItems}
      descriptions={descriptions}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      isMobileOpen={isMobileOpen}
      onCloseMobile={onCloseMobile}
    />
  );
}

// Keep type export for backward compat (no longer used as tab type but kept for any imports)
export type DashboardTab =
  | "home"
  | "interviews"
  | "analytics"
  | "profile"
  | "settings"
  | "help";
