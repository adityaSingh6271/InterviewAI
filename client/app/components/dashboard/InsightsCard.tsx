"use client";

import React from "react";
import { SparklesIcon } from "../Icons";

interface InsightsCardProps {
  sessionCount?: number;
  readinessScore?: string;
  completedRounds?: number | string;
  diagnosticMessage?: string | null;
}

export default function InsightsCard({
  sessionCount = 0,
  readinessScore = "—",
  completedRounds = 0,
  diagnosticMessage,
}: InsightsCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xs hover:border-[#0C356A]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between h-full">
      {/* Top Banner / Coach insight */}
      <div>
        <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-3.5">
          <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg bg-[#0C356A] text-white flex items-center justify-center shadow-2xs shrink-0">
            <SparklesIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div>
            <h4 className="text-[14px] sm:text-[15px] font-semibold text-slate-900 leading-tight">
              AI Executive Coach
            </h4>
            <span className="text-[11px] sm:text-[11.5px] text-[#0C356A] font-medium">
              Latest Diagnostic
            </span>
          </div>
        </div>

        {/* Insight Text in subtle structured panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-2xs">
          {diagnosticMessage ? (
            <p className="text-[12.5px] sm:text-[13.5px] text-slate-700 leading-relaxed font-normal line-clamp-4">
              &ldquo;{diagnosticMessage}&rdquo;
            </p>
          ) : sessionCount > 0 ? (
            <p className="text-[12.5px] sm:text-[13.5px] text-slate-600 leading-relaxed font-normal">
              You have {sessionCount} active interview workspace{sessionCount === 1 ? "" : "s"}
              {Number(completedRounds) > 0
                ? ` with ${completedRounds} completed round${Number(completedRounds) === 1 ? "" : "s"}.`
                : ". Complete a simulation round to generate AI examiner feedback."}
            </p>
          ) : (
            <p className="text-[12.5px] sm:text-[13.5px] text-slate-500 leading-relaxed font-normal">
              No interview sessions recorded yet. Create an interview workspace to receive AI diagnostics and readiness tracking.
            </p>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3.5 sm:pt-4 mt-3.5 sm:mt-4 border-t border-slate-200">
        <div className="bg-white rounded-xl p-2 sm:p-3 border border-slate-200 text-center hover:border-[#0C356A]/40 transition-colors shadow-2xs">
          <div className="text-lg min-[380px]:text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">
            {readinessScore}
          </div>
          <div className="text-[10px] min-[380px]:text-[11px] sm:text-[11.5px] font-medium text-slate-500 mt-1 truncate">
            Readiness
          </div>
        </div>
        <div className="bg-white rounded-xl p-2 sm:p-3 border border-slate-200 text-center hover:border-[#0C356A]/40 transition-colors shadow-2xs">
          <div className="text-lg min-[380px]:text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">
            {sessionCount}
          </div>
          <div className="text-[10px] min-[380px]:text-[11px] sm:text-[11.5px] font-medium text-slate-500 mt-1 truncate">
            Interviews
          </div>
        </div>
        <div className="bg-white rounded-xl p-2 sm:p-3 border border-slate-200 text-center hover:border-[#0C356A]/40 transition-colors shadow-2xs">
          <div className="text-lg min-[380px]:text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">
            {completedRounds}
          </div>
          <div className="text-[10px] min-[380px]:text-[11px] sm:text-[11.5px] font-medium text-slate-500 mt-1 truncate">
            Rounds Done
          </div>
        </div>
      </div>
    </div>
  );
}
