"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "./providers/AuthProvider";
import { LogoIcon, LogoutExitIcon, PanelLeftIcon, XMarkIcon } from "./Icons";

/**
 * Shared sidebar shell (Standards §8: one navigation pattern, not two).
 *
 * `Sidebar` (student dashboard) and `AdminSidebar` are thin wrappers that
 * pass their own item lists - this component owns the visuals (mobile drawer,
 * desktop rail, collapse, active state, sign-out).
 */

export interface SidebarItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarShellProps {
  /** Brand link target (section root). */
  homeHref: string;
  brandTitle?: string;
  brandSubtitle?: string;
  sectionLabel?: string;
  navItems: SidebarItem[];
  bottomItems?: SidebarItem[];
  /** Optional per-href subtitles shown under each label. */
  descriptions?: Record<string, string>;
  /** Href that only matches exactly (the section root); others prefix-match. */
  exactHref?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

function NavLink({
  href,
  label,
  icon: Icon,
  subtitle,
  isActive,
  isCollapsed,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  isActive: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      data-testid={`nav-${href}`}
      className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 group ${
        isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5"
      } ${
        isActive
          ? "bg-blue-50 text-blue-600 font-semibold"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal"
      }`}
    >
      <Icon
        className={`w-4.5 h-4.5 shrink-0 transition-colors ${
          isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
        }`}
      />
      {!isCollapsed && (
        <div className="flex flex-col min-w-0 text-left">
          <span className="text-[14px] font-semibold whitespace-nowrap leading-tight">
            {label}
          </span>
          {subtitle && (
            <span
              className={`text-[12px] leading-tight truncate mt-0.5 font-normal ${
                isActive
                  ? "text-blue-500/80"
                  : "text-slate-400 group-hover:text-slate-500"
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

export default function SidebarShell({
  homeHref,
  brandTitle = "InterviewAI",
  brandSubtitle = "Pro Edition",
  sectionLabel = "MAIN MENU",
  navItems,
  bottomItems = [],
  descriptions,
  exactHref,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isActive = (href: string) =>
    exactHref && href === exactHref ? pathname === href : pathname.startsWith(href);

  const subtitleFor = (href: string) => descriptions?.[href];

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await logout();
      router.push("/login");
    } catch {
      // The local session is cleared regardless; the auth guard in the
      // layout redirects to /login on its own.
      toast.error("Sign out failed. Please try again.");
      router.push("/login");
    } finally {
      setIsSigningOut(false);
    }
  };

  // Rendered twice (mobile drawer + desktop rail); the drawer never collapses.
  const renderSignOut = (collapsed: boolean) => (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      title={collapsed ? "Sign Out" : undefined}
      data-testid="sign-out"
      className={`w-full flex items-center gap-3 rounded-xl text-slate-600 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
        collapsed ? "justify-center p-2.5" : "px-3 py-2.5"
      }`}
    >
      {isSigningOut ? (
        <span className="w-4.5 h-4.5 shrink-0 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <LogoutExitIcon className="w-4.5 h-4.5 shrink-0 text-slate-400" />
      )}
      {!collapsed && (
        <span className="text-[14px] font-medium whitespace-nowrap leading-none">
          {isSigningOut ? "Signing Out..." : "Sign Out"}
        </span>
      )}
    </button>
  );

  return (
    <>
      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
          />
          <aside className="relative w-64 max-w-[85vw] bg-white text-slate-800 h-full flex flex-col justify-between py-5 px-3 z-50 shadow-2xl border-r border-slate-200">
            <div>
              <div className="flex items-center justify-between mb-6 px-2">
                <Link
                  href={homeHref}
                  onClick={onCloseMobile}
                  className="flex items-center gap-2.5"
                >
                  <LogoIcon className="w-8 h-8 rounded-lg shadow-xs shrink-0" />
                  <div className="whitespace-nowrap">
                    <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight leading-tight">
                      {brandTitle}
                    </h1>
                    <span className="text-[11.5px] font-normal text-slate-400 block mt-0.5">
                      {brandSubtitle}
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  aria-label="Close navigation menu"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              {sectionLabel && !isCollapsed && (
            <div className="text-[10.5px] font-semibold text-slate-400 px-3 mb-2 tracking-wider uppercase">
              {sectionLabel}
            </div>
          )}

          <nav className="space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    subtitle={subtitleFor(item.href)}
                    isActive={isActive(item.href)}
                    onClick={onCloseMobile}
                  />
                ))}
              </nav>
            </div>
            <div className="pt-3.5 border-t border-slate-100 space-y-2">
              {bottomItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  subtitle={subtitleFor(item.href)}
                  isActive={isActive(item.href)}
                  onClick={onCloseMobile}
                />
              ))}
              {renderSignOut(false)}
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex bg-white border-r border-slate-200 h-screen max-h-screen sticky top-0 flex-col justify-between z-20 select-none transition-all duration-300 ease-in-out shrink-0 overflow-hidden py-4.5 ${
          isCollapsed ? "w-16 px-1.5" : "w-60 px-3"
        }`}
      >
        <div className="flex flex-col">
          <div
            className={`flex items-center mb-6 ${isCollapsed ? "justify-center px-0" : "justify-between px-2"}`}
          >
            {!isCollapsed && (
              <Link
                href={homeHref}
                className="flex items-center gap-2.5 group overflow-hidden"
              >
                <LogoIcon className="w-8 h-8 rounded-lg shadow-xs shrink-0 transition-transform group-hover:scale-105 duration-200" />
                <div className="whitespace-nowrap">
                  <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight leading-tight">
                    {brandTitle}
                  </h1>
                  <span className="text-[11.5px] font-normal text-slate-400 block mt-0.5">
                    {brandSubtitle}
                  </span>
                </div>
              </Link>
            )}
            {isCollapsed && (
              <Link href={homeHref} title={brandTitle}>
                <LogoIcon className="w-8 h-8 rounded-lg shadow-xs" />
              </Link>
            )}
            {!isCollapsed && onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Collapse sidebar"
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <PanelLeftIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isCollapsed && onToggleCollapse && (
            <div className="mb-4 flex justify-center">
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Expand sidebar"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <PanelLeftIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {sectionLabel && !isCollapsed && (
            <div className="text-[10.5px] font-semibold text-slate-400 px-3 mb-2 tracking-wider uppercase">
              {sectionLabel}
            </div>
          )}

          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                subtitle={subtitleFor(item.href)}
                isActive={isActive(item.href)}
                isCollapsed={isCollapsed}
              />
            ))}
          </nav>
        </div>

        <div className="pt-3.5 border-t border-slate-100 space-y-2">
          {bottomItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              subtitle={subtitleFor(item.href)}
              isActive={isActive(item.href)}
              isCollapsed={isCollapsed}
            />
          ))}
          {renderSignOut(isCollapsed)}
        </div>
      </aside>
    </>
  );
}
