"use client";

import React from "react";
import {
  XCircle,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export default function ProblemSection() {
  const painPoints = [
    {
      title: "Rote LeetCode & Trivia Memorization",
      description: "Blindly solving generic algorithms doesn't prepare you for real architectural trade-offs, failure recovery, or ambiguous requirements asked in staff loops.",
      metric: "74% fail rate on unscripted design follow-ups",
    },
    {
      title: "No Seniority Calibration (L4 vs. L7)",
      description: "Generic mocks treat junior and principal engineers identically. But hiring committees judge you on scope, ownership, and trade-space nuance.",
      metric: "One-size-fits-all feedback is unusable",
    },
    {
      title: "Silent Communication Flaws",
      description: "You never know if you talked too fast (180+ WPM), rambled without structure, or missed the interviewer's non-verbal hints until the rejection email arrives.",
      metric: "Zero feedback on delivery cadence & filler words",
    },
  ];

  const advantages = [
    {
      title: "Job-Description Grounded Scenarios",
      description: "Every question is generated from the actual tech stack, team scale, and architectural needs extracted directly from the job requisition.",
      highlight: "100% stack relevance",
    },
    {
      title: "Adaptive Interlocutor Pushback",
      description: "The AI interviewer actively challenges your assumptions, introduces edge-case bottlenecks, and asks 'What breaks first when volume doubles?'",
      highlight: "Real committee pressure",
    },
    {
      title: "Sub-Second Telemetry & Diagnostic Scoring",
      description: "Instant metrics on vocal delivery, architectural trade-offs, and hiring-bar likelihood so you iterate and improve before the real interview.",
      highlight: "Actionable rubric scorecards",
    },
  ];

  return (
    <section className="w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 bg-slate-50/70 relative">
      <div className="max-w-6xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>The Traditional Preparation Gap</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-950 tracking-tight leading-tight">
            Why memorizing generic questions fails when high-stakes offers are on the line.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 mt-4 leading-relaxed font-normal">
            Top tech hiring bars don&apos;t test trivia. They test how you think through ambiguity under pressure.
          </p>
        </div>

        {/* Side-by-Side Modern Comparison Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Left Column: The Old Way (Generic Prep) */}
          <div className="rounded-2xl p-6 sm:p-8 bg-white border border-rose-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-amber-400" />
            
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base">Traditional Preparation</h3>
                    <span className="text-xs text-rose-600 font-medium">Uncalibrated & Generic</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400">Status Quo</span>
              </div>

              <div className="space-y-6">
                {painPoints.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-rose-500 font-bold text-sm shrink-0 mt-0.5">✕</span>
                      <h4 className="font-semibold text-slate-900 text-sm sm:text-base">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 pl-5 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="pl-5 pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50/80 px-2 py-0.5 rounded border border-rose-100">
                        <TrendingDown className="w-3 h-3" />
                        {item.metric}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Outcome: High anxiety & unexpected rejections</span>
              <span className="text-rose-500 font-semibold font-mono">Unpredictable</span>
            </div>
          </div>

          {/* Right Column: The New Way (InterviewAI Precision) */}
          <div className="rounded-2xl p-6 sm:p-8 bg-slate-950 text-white border border-indigo-900/60 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />
            
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base">InterviewAI Intelligence</h3>
                    <span className="text-xs text-emerald-400 font-medium">Calibrated to Your Exact Requisition</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">Precision Model</span>
              </div>

              <div className="space-y-6">
                {advantages.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold text-sm shrink-0 mt-0.5">✓</span>
                      <h4 className="font-semibold text-white text-sm sm:text-base">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 pl-5 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="pl-5 pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        {item.highlight}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Outcome: Calibrated readiness & interview mastery</span>
              <span className="text-emerald-400 font-semibold font-mono">94.8% Pass Likelihood</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
