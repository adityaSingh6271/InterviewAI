"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoIcon, MenuIcon, XMarkIcon } from "./Icons";
import { IconButton, Add01Icon } from "@/components/common/icon-button";

export default function Navbar() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 sm:h-18">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C356A] rounded-lg"
          aria-label="InterviewAI Home"
        >
          <LogoIcon className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-xs transition-transform group-hover:scale-105 duration-200" />
          <span className="text-[18px] sm:text-[19px] font-semibold tracking-tight text-slate-900">
            InterviewAI
          </span>
        </Link>

        {/* Center Nav Links - Desktop */}
        <nav
          className="hidden md:flex items-center gap-7 lg:gap-9 text-[14.5px] font-medium text-slate-600"
          aria-label="Main Navigation"
        >
          <Link
            href="#product"
            className="hover:text-slate-900 transition-colors duration-150 py-1"
          >
            Product
          </Link>
          <Link
            href="#how-it-works"
            className="hover:text-slate-900 transition-colors duration-150 py-1"
          >
            How It Works
          </Link>
          <Link
            href="#features"
            className="hover:text-slate-900 transition-colors duration-150 py-1"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="hover:text-slate-900 transition-colors duration-150 py-1"
          >
            Pricing
          </Link>
        </nav>

        {/* Right Actions - Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-[14.5px] font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C356A] rounded-lg"
          >
            Log In
          </Link>
          
          <IconButton
            type="button"
            icon={Add01Icon}
            iconPosition="right"
            label="Create Interview"
            variant="default"
            onClick={() => router.push("/dashboard/interviews/new")}
            className="h-9 px-4 text-xs sm:text-sm font-semibold shadow-xs"
          />
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C356A] cursor-pointer min-h-11 min-w-11 flex items-center justify-center"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="w-5 h-5" />
            ) : (
              <MenuIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer/Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-5 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-2 text-[15px] font-medium text-slate-700">
            <Link
              href="#product"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Product
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Pricing
            </Link>
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2 text-center text-[14px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200"
            >
              Log In
            </Link>
            
            <IconButton
              type="button"
              action="create"
              label="Create Job Interview"
              onClick={() => {
                setMobileMenuOpen(false);
                router.push("/dashboard/interviews/new");
              }}
              className="w-full justify-center h-10 text-sm font-semibold shadow-xs"
            />
          </div>
        </div>
      )}
    </header>
  );
}
