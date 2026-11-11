"use client";

import React from "react";
import {
  CheckCircle2,
  TrendingUp,
  Mic,
  Brain,
  BarChart2,
  Lightbulb,
  Award,
} from "lucide-react";

export default function AnalyticsSection() {
  const competencies = [
    { name: "System Architecture & High Availability", score: 91, status: "Staff Calibrated", color: "bg-indigo-600" },
    { name: "Trade-off Nuance & Failure Recovery", score: 87, status: "Strong Recommendation", color: "bg-teal-500" },
    { name: "Vocal Delivery, Tone & Clarity", score: 82, status: "Optimal Cadence", color: "bg-sky-500" },
    { name: "Behavioral STAR & Ownership Impact", score: 94, status: "Exceeds Bar", color: "bg-emerald-500" },
  ];

  return (
    <section id="product" className="w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 bg-white relative">
      <div className="max-w-6xl mx-auto">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Diagnostic Intelligence</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-950 tracking-tight leading-tight">
            Clear diagnostics.
            <br />
            <span className="text-indigo-600">Zero mystery about your performance.</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 mt-4 leading-relaxed font-normal">
            Every simulation generates an exhaustive, multi-dimensional scorecard showing exactly where you passed and where you need tighter articulation.
          </p>
        </div>

        {/* Analytics Card Preview */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-9 lg:p-11 border border-slate-800 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Overall Readiness & Summary */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                    Hiring Committee Target
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-600/40 px-2.5 py-1 rounded-md">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Strong Hire
                  </span>
                </div>
                
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white">
                    94.8%
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-emerald-400 flex items-center gap-0.5 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                    <TrendingUp className="w-4 h-4" /> +14.2% vs Round 1
                  </span>
                </div>
                
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-3">
                  Demonstrated staff-level mastery of distributed data partitioning and failover scenarios with structured trade-off reasoning.
                </p>
              </div>

              {/* Cadence & Depth Badges */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/80 rounded-2xl p-4 sm:p-5 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Mic className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-medium text-slate-400">Vocal Cadence</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">142 <span className="text-xs font-normal text-slate-400">WPM</span></p>
                  <p className="text-[11px] text-teal-400 font-medium mt-1">Optimal conversational flow</p>
                </div>

                <div className="bg-slate-950/80 rounded-2xl p-4 sm:p-5 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-medium text-slate-400">Tech Depth</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">89%</p>
                  <p className="text-[11px] text-indigo-400 font-medium mt-1">Staff L6 calibrated</p>
                </div>
              </div>
            </div>

            {/* Right: Competency Breakdown & AI Feedback Quote */}
            <div className="lg:col-span-7 bg-slate-950/80 rounded-2xl p-6 sm:p-8 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm sm:text-base font-semibold text-white">
                      Competency Diagnostic Breakdown
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Attempt #2 · Final Evaluation</span>
                </div>

                <div className="space-y-4 mb-7">
                  {competencies.map((comp, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-200">{comp.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[11px]">{comp.status}</span>
                          <span className="font-bold text-white font-mono">{comp.score}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`${comp.color} h-full rounded-full transition-all duration-300`}
                          style={{ width: `${comp.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Direct Coaching Insight */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-semibold uppercase tracking-wider text-[11px]">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>AI Evaluator Coaching Note</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    &ldquo;Exceptional response on cross-region quorum replication. To reach L7 Principal benchmark, explicitly address consumer lag monitoring and automated poison-pill dead lettering earlier in your answer.&rdquo;
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
