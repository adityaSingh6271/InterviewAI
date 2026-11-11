"use client";

import React from "react";
import type { JobInterview } from "@/lib/types/jobInterview";
import { Award, Clock, FileText, MessageSquare } from "lucide-react";

interface WorkspaceReportsProps {
  interview: JobInterview;
}

export default function WorkspaceReports({ interview }: WorkspaceReportsProps) {
  const attempts = interview.attempts;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#0C356A]/10 text-[#0C356A] dark:bg-blue-950/50 dark:text-blue-400">
            <Award className="size-5" />
          </div>
          <div>
            <h3 className="text-[14.5px] sm:text-base font-bold text-slate-900 dark:text-white">
              Simulation Attempt Reports ({attempts.length})
            </h3>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
              Detailed breakdown of scores, duration, and AI examiner feedback per attempt.
            </p>
          </div>
        </div>
      </div>

      {attempts.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#1E1E2D] rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
          <FileText className="size-8 text-slate-300 mx-auto mb-1.5" />
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            No Attempts Recorded Yet
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Launch any simulation round in the Rounds or Overview tab to generate an evaluation report!
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {attempts.map((att, idx) => {
            const roundObj = interview.rounds.find((r) => r.id === att.roundId);
            return (
              <div
                key={att.id || idx}
                className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-[#0C356A]/10 dark:bg-blue-950/60 text-[#0C356A] dark:text-blue-300">
                        {roundObj ? `Round ${roundObj.order}` : "Round"}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {roundObj?.title || "Simulation Round"}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Clock className="size-3" />
                      {new Date(att.completedAt).toLocaleString()} &bull; Duration: {att.durationMinutes} mins
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {att.score}%
                    </span>
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                      Score
                    </span>
                  </div>
                </div>

                {att.feedback && (
                  <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5 text-xs">
                    <MessageSquare className="size-3.5 text-[#0C356A] dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block mb-0.5 text-[11.5px]">
                        AI Examiner Feedback:
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px]">
                        {att.feedback}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
