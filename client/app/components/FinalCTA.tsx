"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { IconButton, Add01Icon } from "@/components/common/icon-button";

export default function FinalCTA() {
  const router = useRouter();

  return (
    <section className="w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 bg-white relative overflow-hidden">
      {/* Background glow radial */}
      <div className="absolute inset-0 bg-radial-[circle_at_center] from-indigo-50/70 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center flex flex-col items-center relative z-10">
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Zero Preparation Friction</span>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-950 leading-tight mb-5">
          Walk into your next interview
          <br />
          <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
            with undeniable confidence.
          </span>
        </h2>

        <p className="text-base sm:text-lg text-slate-600 max-w-xl mb-9 leading-relaxed font-normal">
          Don&apos;t leave your dream offer to chance. Run a realistic simulation against your target job spec right now and find out where you stand.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <IconButton
            type="button"
            icon={Add01Icon}
            iconPosition="right"
            label="Start Free Mock Simulation"
            variant="default"
            onClick={() => router.push("/dashboard/interviews/new")}
            className="w-full sm:w-auto h-12 px-8 text-sm sm:text-base font-semibold shadow-lg bg-indigo-600 hover:bg-indigo-700"
          />
        </div>

        {/* Confidence Checkpoints */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-500 mt-8">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Instant feedback in 60 seconds</span>
          </div>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>No credit card required</span>
          </div>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Works with any tech stack or role</span>
          </div>
        </div>

      </div>
    </section>
  );
}
