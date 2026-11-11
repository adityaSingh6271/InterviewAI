"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Activity,
  Brain,
  Mic,
  CheckCircle2,
  ShieldCheck,
  Award,
} from "lucide-react";
import IconButton, { Add01Icon, EyeIcon } from "@/components/common/icon-button";

export default function HeroSection() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"system-design" | "coding" | "behavioral">("system-design");

  return (
    <section className="w-full pt-8 sm:pt-12 md:pt-14 pb-14 sm:pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
        
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs sm:text-[13px] font-medium mb-5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-semibold text-slate-900">AI Mock Interviews</span>
          <span className="text-slate-300">·</span>
          <span className="text-indigo-600">L4–L7 Calibrated</span>
        </div>

        {/* Main Headline - Short & Punchy */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-950 leading-[1.12] max-w-3xl mb-4 sm:mb-5">
          Ace your next interview with real-time AI practice.
        </h1>

        {/* Short Subhead - Removed excessive text */}
        <p className="text-base sm:text-lg text-slate-600 max-w-lg leading-relaxed mb-7 font-normal">
          Personalized simulations tailored to your resume and target job spec, with live voice and instant diagnostic scoring.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto mb-4">
          <IconButton
            type="button"
            icon={Add01Icon}
            iconPosition="right"
            label="Start Free Practice"
            variant="default"
            onClick={() => router.push("/dashboard/interviews/new")}
            className="w-full sm:w-auto h-11 px-6 text-sm sm:text-base font-semibold shadow-xs"
          />
          
          <Link href="#product" className="w-full sm:w-auto block">
            <IconButton
              type="button"
              icon={EyeIcon}
              label="See Demo"
              variant="outline"
              className="w-full sm:w-auto h-11 px-5 text-sm sm:text-base font-medium"
            />
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-2 text-xs sm:text-[13px] text-slate-500 mb-10 sm:mb-14">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>No credit card required · Free instant sessions</span>
        </div>

        {/* Product Visual Mockup */}
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden text-left">
          
          {/* Top Window Chrome */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-slate-400 font-mono text-[11px] hidden sm:inline">
                interviewai.app/live-session
              </span>
            </div>

            {/* Mode selection tabs */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("system-design")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === "system-design"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                System Design
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("coding")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === "coding"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Coding
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("behavioral")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === "behavioral"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Behavioral
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Live Simulation</span>
            </div>
          </div>

          {/* Product Interface Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 bg-slate-950 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
            
            {/* Left: AI Interviewer Video/Voice Simulation */}
            <div className="lg:col-span-7 relative min-h-[280px] sm:min-h-[340px] p-5 flex flex-col justify-between overflow-hidden bg-slate-950">
              <Image
                src="/images/hero-interviewer.jpg"
                alt="AI Interviewer simulation"
                fill
                priority
                className="object-cover object-center opacity-40 mix-blend-luminosity"
                sizes="(max-width: 768px) 100vw, 600px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20 pointer-events-none" />

              {/* Interlocutor Info Header */}
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400 block tracking-wider">
                    AI Interviewer
                  </span>
                  <span className="text-white font-semibold text-base">
                    Dr. Sarah Vance
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-[11px] text-emerald-400">
                  <Activity className="w-3 h-3 animate-pulse" />
                  <span>138 WPM</span>
                </div>
              </div>

              {/* Question Prompt */}
              <div className="relative z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-4 mt-auto">
                <p className="text-[11px] font-mono text-indigo-300 mb-1">
                  ROUND 2 · DISTRIBUTED SYSTEMS
                </p>
                <p className="text-sm sm:text-[15px] text-slate-100 font-medium leading-snug">
                  &ldquo;How would you design a distributed cache invalidation strategy for multi-region failover?&rdquo;
                </p>
              </div>
            </div>

            {/* Right: Live Diagnostics Telemetry */}
            <div className="lg:col-span-5 p-5 bg-slate-900/95 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Diagnostic Score
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded">
                    Staff L6 Calibrated
                  </span>
                </div>

                {/* Readiness Score Big Metric */}
                <div className="bg-slate-950/90 rounded-xl p-3.5 border border-slate-800 mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">Hiring Bar Score</span>
                    <span className="text-emerald-400 font-bold text-sm">94% Pass Target</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full"
                      style={{ width: "94%" }}
                    />
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-slate-300">Technical Depth</span>
                    </div>
                    <span className="font-semibold text-white">89%</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-slate-300">Delivery Clarity</span>
                    </div>
                    <span className="font-semibold text-white">95%</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-slate-300">Job Spec Match</span>
                    </div>
                    <span className="font-semibold text-white">92%</span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Summary */}
              <div className="pt-2.5 border-t border-slate-800 text-[11px] flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Strong Hire Target
                </span>
                <span className="text-indigo-400 font-mono">Scorecard #041</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
