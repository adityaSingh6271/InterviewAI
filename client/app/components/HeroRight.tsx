"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Activity, Brain, CheckCircle2, Mic, Sparkles } from "lucide-react";

export default function HeroRight() {
  const router = useRouter();

  return (
    <div className="flex flex-col w-full max-w-full lg:max-w-160 xl:max-w-175 gap-3.5 sm:gap-4 mx-auto lg:mx-0">
      {/* ── Main Interview Monitor / Live Workspace ── */}
      <div
        onClick={() => router.push("/dashboard")}
        className="relative w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-[0_16px_40px_-8px_rgba(15,23,42,0.14)] bg-slate-950 group cursor-pointer"
        style={{ aspectRatio: "16/10" }}
      >
        <Image
          src="/images/hero-avatar.jpg"
          alt="Real-Time AI Avatar mock interview session"
          fill
          priority
          className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.015]"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 620px"
        />

        {/* Realistic video overlay gradient */}
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/92 via-slate-950/35 to-slate-950/20 pointer-events-none" />

        {/* Top Header Bar inside Video Preview */}
        <div className="absolute top-3.5 sm:top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/10 text-white px-2.5 py-1 rounded-lg text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>00:14:32</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-white/10 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>LIVE SESSION</span>
          </div>
        </div>

        {/* Bottom Info & Speech Prompt */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10">
          <div className="flex items-end justify-between gap-3 mb-2.5">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[10.5px] font-bold text-indigo-300 uppercase tracking-wider">
                  AI Interviewer
                </p>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  <Sparkles className="w-2.5 h-2.5" /> Staff Bar Raiser
                </span>
              </div>
              <h3 className="text-[16px] sm:text-[18px] font-bold text-white tracking-tight leading-none">
                Dr. Aris Thorne
              </h3>
            </div>

            {/* Speech Telemetry Pill */}
            <div className="bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-1.5 text-right">
              <div className="flex items-center justify-end gap-1 mb-0.5">
                <Activity className="w-3 h-3 text-teal-400 animate-pulse" />
                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wide">
                  Speech
                </span>
              </div>
              <p className="text-[15px] font-bold text-white leading-none">
                138{" "}
                <span className="text-[10.5px] font-normal text-slate-300">
                  WPM
                </span>
              </p>
            </div>
          </div>

          {/* AI Question Prompt Bubble */}
          <div className="px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl">
            <p className="text-[13px] text-slate-200 leading-snug">
              <span className="text-indigo-300 font-semibold">&ldquo;</span>
              Walk me through your multi-region database failover and cache
              invalidation strategy.
              <span className="text-indigo-300 font-semibold">&rdquo;</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── 3 Supporting Telemetry / Metric Cards ── */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-3 sm:gap-3.5">
        {/* Metric 1: Technical Depth */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Brain className="w-3.5 h-3.5" />
            </div>
            <span className="text-[13px] font-bold text-indigo-700">
              88%
            </span>
          </div>
          <div>
            <p className="text-[14px] font-bold text-slate-900 leading-tight">
              Technical Depth
            </p>
            <p className="text-[12px] text-slate-500 mt-0.5 leading-tight">
              Architecture & rigor
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 mt-2.5">
            <div
              className="h-1.5 rounded-full bg-indigo-600"
              style={{ width: "88%" }}
            />
          </div>
        </div>

        {/* Metric 2: Confidence */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Mic className="w-3.5 h-3.5" />
            </div>
            <span className="text-[13px] font-bold text-teal-700">
              76%
            </span>
          </div>
          <div>
            <p className="text-[14px] font-bold text-slate-900 leading-tight">
              Delivery Clarity
            </p>
            <p className="text-[12px] text-slate-500 mt-0.5 leading-tight">
              Pacing & minimal fillers
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 mt-2.5">
            <div
              className="h-1.5 rounded-full bg-teal-600"
              style={{ width: "76%" }}
            />
          </div>
        </div>

        {/* Metric 3: Readiness Score */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-[13px] font-bold text-emerald-700">
              94.8%
            </span>
          </div>
          <div>
            <p className="text-[14px] font-bold text-slate-900 leading-tight">
              Readiness Score
            </p>
            <p className="text-[12px] text-slate-500 mt-0.5 leading-tight">
              Committee pass target
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 mt-2.5">
            <div
              className="h-1.5 rounded-full bg-emerald-600"
              style={{ width: "94.8%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
