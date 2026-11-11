"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { MenuIcon } from "../components/Icons";
import Link from "next/link";
import { useAuth } from "../components/providers/AuthProvider";
import { adminRoleLabel } from "@/lib/adminRole";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { toggleSidebar } from "@/lib/redux/slices/uiSlice";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params?: Promise<Record<string, string | string[] | undefined>>;
}

export default function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
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

  // Guard: anonymous visitors are sent to the login page.
  useEffect(() => {
    if (!mounted) return;
    if (status === "anonymous") router.replace("/login");
  }, [mounted, status, router]);

  if (!mounted || status === "loading" || status === "anonymous") {
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

  const displayName = user?.name ?? "Candidate";
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || "C";
  // Portal-aware label: admins keep their role, candidates their track.
  const roleLabel = user?.adminRole
    ? adminRoleLabel(user.adminRole)
    : "Student Candidate";

  return (
    <div className="h-screen max-h-screen w-full bg-white flex text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => dispatch(toggleSidebar())}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen max-h-screen overflow-y-auto no-scrollbar bg-white">
        {/* Topbar */}
        <header className="w-full bg-white border-b border-slate-200 px-3.5 sm:px-7 h-14 sm:h-15 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Toggle navigation menu"
              className="lg:hidden w-8.5 h-8.5 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11.5px] font-semibold border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>AI Avatar Ready</span>
            </div> */}
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity pl-2 sm:pl-3 border-l border-slate-200"
            >
              <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
                {displayInitial}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-[12.5px] font-bold text-slate-900 leading-none">
                  {displayName}
                </div>
                <span className="text-[11px] text-slate-500">{roleLabel}</span>
              </div>
              <svg
                className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5 hidden md:block"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full max-w-[1560px] mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 overflow-x-clip">
          {children}
        </main>

        {/* Footer */}
        <footer className="shrink-0 w-full px-5 sm:px-7 py-4  text-[11.5px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2024 InterviewAI. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a
              href="#privacy"
              className="hover:text-slate-700 transition-colors"
            >
              Privacy
            </a>
            <a href="#terms" className="hover:text-slate-700 transition-colors">
              Terms
            </a>
            <Link
              href="/dashboard/help"
              className="hover:text-slate-700 transition-colors"
            >
              Support
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
