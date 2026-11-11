"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import { MenuIcon } from "../components/Icons";
import { useAuth } from "../components/providers/AuthProvider";
import { ADMIN_ROLE_SHORT_LABELS, adminRoleLabel } from "@/lib/adminRole";
import type { AdminRole } from "@/lib/api/admin";
import AiStatusBadge from "../components/admin/AiStatusBadge";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { toggleSidebar } from "@/lib/redux/slices/uiSlice";

/**
 * Admin portal shell: role guard + admin sidebar + topbar + page frame.
 *
 * Guard (client-side, Standards §12): anonymous -> /login, and a signed-in
 * student session -> /dashboard (admins live at /admin). The server enforces
 * the real permissions; this only keeps non-admins out of admin screens.
 */
interface AdminLayoutProps {
  children: React.ReactNode;
  params?: Promise<Record<string, string | string[] | undefined>>;
}

export default function AdminLayout({
  children,
  params,
}: AdminLayoutProps) {
  if (params) {
    React.use(params);
  }
  const router = useRouter();
  const { user, status } = useAuth();
  const dispatch = useAppDispatch();
  const isCollapsed = useAppSelector((state) => state.ui.isSidebarCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdminSession = status === "authenticated" && user?.portal === "admin";

  // Guard: anonymous visitors go to login, students go back to their portal.
  useEffect(() => {
    if (!mounted) return;
    if (status === "anonymous") router.replace("/login");
    else if (status === "authenticated" && user && user.portal !== "admin") {
      router.replace("/dashboard");
    }
  }, [mounted, status, user, router]);

  if (!mounted || status === "loading" || status === "anonymous" || !isAdminSession) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <span
          role="status"
          aria-label="Checking your session"
          className="inline-block w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"
        />
      </div>
    );
  }

  const displayName = user?.name ?? "Administrator";
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || "A";
  const roleLabel = user?.adminRole
    ? ADMIN_ROLE_SHORT_LABELS[user.adminRole as AdminRole]
    : adminRoleLabel(user?.adminRole);

  return (
    <div className="h-screen max-h-screen w-full bg-white flex text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => dispatch(toggleSidebar())}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen max-h-screen overflow-y-auto no-scrollbar bg-white">
        {/* Topbar */}
        <header className="w-full bg-white border-b border-slate-200 px-3.5 sm:px-7 py-2.5 sm:py-3.5 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Toggle navigation menu"
              className="lg:hidden w-8.5 h-8.5 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            {/* <span className="hidden sm:block text-[12.5px] font-semibold text-slate-500">
              Admin Console
            </span> */}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <AiStatusBadge />
            {/* <span
              data-testid="admin-role-badge"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0C356A]/8 text-[#0C356A] text-[11.5px] font-semibold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0C356A]" />
              <span>{roleLabel}</span>
            </span> */}
            <Link
              href="/admin/accounts"
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity pl-2 sm:pl-3 border-l border-slate-200"
            >
              <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-linear-to-tr from-[#0C356A] to-[#2E5A9E] flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
                {displayInitial}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-[12.5px] font-bold text-slate-900 leading-none">
                  {displayName}
                </div>
                <span className="text-[10.5px] text-slate-500">
                  {roleLabel}
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full max-w-[1560px] mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 overflow-x-hidden">
          {children}
        </main>

        {/* Footer */}
        <footer className="shrink-0 w-full px-5 sm:px-7 py-4 text-[11.5px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2024 InterviewAI. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span>Admin Portal</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
