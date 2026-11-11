"use client";

import React from "react";
import type { InterviewRound } from "@/lib/types/jobInterview";
import { Layers, Clock, ShieldCheck, Code, Cpu, MessageSquare, UserCheck } from "lucide-react";

interface InterviewPlanPreviewProps {
  rounds: InterviewRound[];
  sessionDurationMinutes: number;
  setSessionDurationMinutes: (v: number) => void;
}

const getRoundIcon = (type: string) => {
  switch (type) {
    case "technical":
      return Cpu;
    case "coding":
      return Code;
    case "system_design":
      return Layers;
    case "behavioral":
      return MessageSquare;
    case "hr":
      return UserCheck;
    default:
      return ShieldCheck;
  }
};

export default function InterviewPlanPreview({
  rounds,
  sessionDurationMinutes,
  setSessionDurationMinutes,
}: InterviewPlanPreviewProps) {
  return (
    <div className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#0C356A]/10 text-[#0C356A] dark:bg-blue-950/50 dark:text-blue-400">
            <Layers className="size-4" />
          </div>
          <div>
            <h3 className="text-[14.5px] sm:text-base font-bold text-slate-900 dark:text-white">
              Generated Multi-Round Interview Plan ({rounds.length} Rounds)
            </h3>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
              Each round tests distinct competencies tailored for this specific role.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="size-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Default Session Length:
          </span>
          <select
            value={sessionDurationMinutes}
            onChange={(e) => setSessionDurationMinutes(Number(e.target.value))}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-50/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20"
          >
            <option value={20}>20 mins</option>
            <option value={30}>30 mins</option>
            <option value={45}>45 mins</option>
            <option value={60}>60 mins</option>
          </select>
        </div>
      </div>

      <div className="space-y-2.5">
        {rounds.map((round, idx) => {
          const Icon = getRoundIcon(round.type);
          return (
            <div
              key={round.id || idx}
              className="p-3 sm:p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#0C356A]/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-md bg-[#0C356A]/10 dark:bg-blue-950/80 text-[#0C356A] dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  R{round.order}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-[13.5px] font-bold text-slate-900 dark:text-white">
                      {round.title}
                    </h4>
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                      <Icon className="size-3" />
                      {round.type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                    {round.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Clock className="size-3" />
                  ~{round.estimatedDurationMinutes} mins
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
