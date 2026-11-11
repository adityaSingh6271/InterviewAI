"use client";

import React from "react";
import Link from "next/link";
import { LogoIcon } from "./Icons";
import { Sparkles } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-200/90 bg-slate-900 text-slate-300">
      {/* Top Footer Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 items-start">
          
          {/* Brand Info (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 group focus:outline-none"
              aria-label="InterviewAI Home"
            >
              <LogoIcon className="w-8 h-8 rounded-lg shadow-sm transition-transform group-hover:scale-105 duration-200" />
              <span className="text-xl font-bold tracking-tight text-white">
                InterviewAI
              </span>
            </Link>

            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Adaptive AI mock-interview platform that parses real job descriptions, benchmarks your resume, and conducts voice & technical simulation calibrated to hiring committee standards.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Engine Active</span>
              <span className="text-slate-500">·</span>
              <span className="text-indigo-400 font-mono text-[11px]">v2.4 Core</span>
            </div>
          </div>

          {/* Column 1: Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="#product" className="hover:text-white transition-colors">
                  Live Voice & Chat
                </Link>
              </li>
              <li>
                <Link href="#product" className="hover:text-white transition-colors">
                  System Architecture
                </Link>
              </li>
              <li>
                <Link href="#product" className="hover:text-white transition-colors">
                  Behavioral STAR Rubric
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-white transition-colors">
                  Diagnostic Telemetry
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: How & Pricing */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Preparation
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="#how-it-works" className="hover:text-white transition-colors">
                  5-Step Framework
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white transition-colors">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/dashboard/interviews/new" className="hover:text-white transition-colors">
                  Create Job Interview
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">
                  Free Student Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Portals & Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Access & Portals
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Student Sign In
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Admin Sign In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">
                  Join with Institute Code
                </Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">
                  <Sparkles className="w-3 h-3" />
                  Code: DEV2026
                </span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar: Copyright & Designer Attribution */}
      <div className="border-t border-slate-800/80 bg-slate-950/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          
          {/* Copyright & Brand */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span>© {currentYear} InterviewAI. All rights reserved.</span>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="text-slate-500">Autonomous Interview Intelligence</span>
          </div>

          {/* Designer Credit */}
          <div className="flex items-center gap-1.5 text-slate-300 font-medium bg-slate-900/90 px-3.5 py-1 rounded-full border border-slate-800">
            <span>Designed by</span>
            <span className="text-indigo-400 font-semibold tracking-wide">Aditya Singh</span>
          </div>

          {/* Bottom links */}
          <div className="flex items-center gap-4 text-slate-500 text-[11.5px]">
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacy Policy</span>
            <span>·</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Terms of Service</span>
            <span>·</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Security</span>
          </div>

        </div>
      </div>
    </footer>
  );
}
