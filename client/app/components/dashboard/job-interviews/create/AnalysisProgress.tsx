"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Sparkles, CheckCircle2, Search, BrainCircuit, Target } from "lucide-react";

interface AnalysisProgressProps {
  currentPhaseText?: string;
}

const steps = [
  { label: "Scanning Job Description & extracting core requirements", icon: Search },
  { label: "Parsing Candidate Resume & mapping technologies", icon: BrainCircuit },
  { label: "Calculating alignment score & identifying skill gaps", icon: Target },
  { label: "Generating structured multi-round interview curriculum", icon: Sparkles },
];

export default function AnalysisProgress({ currentPhaseText }: AnalysisProgressProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    if (currentPhaseText?.includes("Analyzing Job")) {
      setActiveStepIndex(0);
    } else if (currentPhaseText?.includes("Parsing Resume")) {
      setActiveStepIndex(1);
    } else if (currentPhaseText?.includes("Running Match")) {
      setActiveStepIndex(2);
    } else if (currentPhaseText?.includes("Synthesizing")) {
      setActiveStepIndex(3);
    } else {
      const timer = setInterval(() => {
        setActiveStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 750);
      return () => clearInterval(timer);
    }
  }, [currentPhaseText]);

  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs animate-in fade-in duration-200">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-[#0C356A]/10 flex items-center justify-center text-[#0C356A]">
          <Sparkles className="size-8 animate-pulse" />
        </div>
        <div className="absolute -top-1 -right-1">
          <Loader2 className="size-5 text-[#0C356A] animate-spin" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">
        AI Intelligence Engine at Work
      </h3>
      <p className="text-xs sm:text-[13px] text-slate-500 max-w-md mb-8">
        {currentPhaseText || "Analyzing role specifics and tailoring custom interview simulation parameters..."}
      </p>

      <div className="w-full max-w-md space-y-3 text-left">
        {steps.map((step, idx) => {
          const isDone = idx < activeStepIndex;
          const isCurrent = idx === activeStepIndex;
          const Icon = step.icon;

          return (
            <div
              key={idx}
              className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all duration-300 ${
                isCurrent
                  ? "bg-[#0C356A]/5 border-[#0C356A]/30 text-[#0C356A] shadow-2xs"
                  : isDone
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                  : "bg-white border-slate-200 text-slate-400"
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="size-4.5 text-emerald-600 stroke-[2.5]" />
                ) : isCurrent ? (
                  <Loader2 className="size-4.5 text-[#0C356A] animate-spin" />
                ) : (
                  <Icon className="size-4.5 text-slate-400" />
                )}
              </div>
              <span className={`text-xs sm:text-[13px] ${isCurrent ? "font-bold text-[#0C356A]" : isDone ? "font-semibold text-slate-800" : "font-medium text-slate-400"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
