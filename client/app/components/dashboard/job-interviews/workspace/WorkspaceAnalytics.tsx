"use client";

import React from "react";
import type { JobInterview } from "@/lib/types/jobInterview";
import { BarChart3 } from "lucide-react";

interface WorkspaceAnalyticsProps {
  interview: JobInterview;
}

export default function WorkspaceAnalytics({
  interview,
}: WorkspaceAnalyticsProps) {
  const completedRounds = interview.rounds.filter((r) => r.status === "completed");

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#0C356A]/10 text-[#0C356A] dark:bg-blue-950/50 dark:text-blue-400">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h3 className="text-[14.5px] sm:text-base font-bold text-slate-900 dark:text-white">
              Round Performance & Analytics
            </h3>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
              Evaluations across all completed interview rounds for this role.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of round score bars */}
      <div className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Round Score Breakdown
        </h4>

        <div className="space-y-3.5">
          {interview.rounds.map((round) => {
            const score = round.bestScore || 0;
            const isDone = round.status === "completed";

            return (
              <div key={round.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Round {round.order}: {round.title}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {isDone ? `${score}%` : "Not Attempted"}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isDone
                        ? score >= 85
                          ? "bg-emerald-500"
                          : score >= 70
                          ? "bg-[#0C356A] dark:bg-blue-500"
                          : "bg-amber-500"
                        : "bg-transparent"
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
