"use client";

import React from "react";
import type { JobInterview, InterviewRound } from "@/lib/types/jobInterview";
import {
  Clock,
  Play,
  CheckCircle2,
  MessageSquare,
  Award,
  FileText,
  BarChart3,
  Send,
} from "lucide-react";
import { useStudentApplications } from "@/lib/hooks/useStudentApplications";

interface WorkspaceOverviewProps {
  interview: JobInterview;
  onStartAttempt: (round: InterviewRound) => void;
  onSwitchTab?: (tabId: string) => void;
}

export default function WorkspaceOverview({
  interview,
  onStartAttempt,
}: WorkspaceOverviewProps) {
  const {
    hasApplied,
    getApplication,
    apply,
    isApplying,
    withdraw,
    isWithdrawing,
  } = useStudentApplications();
  const applied = hasApplied(interview.id);
  const application = getApplication(interview.id);

  // Sort rounds sequentially for telemetry
  const sortedRounds = [...interview.rounds].sort((a, b) => a.order - b.order);
  const completedRounds = sortedRounds.filter((r) => r.status === "completed");
  const nextPendingRound = sortedRounds.find((r) => r.status !== "completed");

  const averageScore =
    completedRounds.length > 0
      ? Math.round(
          completedRounds.reduce((acc, r) => acc + (r.bestScore || 0), 0) /
            completedRounds.length,
        )
      : null;

  return (
    <div className="space-y-4 pt-1">
      {/* ── 1. Telemetry Readiness & Milestone Summary Card ── */}
      <div className="bg-white dark:bg-[#1E1E2D] p-5 sm:p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Diagnostic Readiness Telemetry
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Preparation Progress & Diagnostic Milestones
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregated readiness tracking based on simulation attempts and AI
              examiner evaluations.
            </p>
          </div>

          {/* Quick Launch Next Pending Round */}
          {nextPendingRound ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 shrink-0">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  Next Recommended Milestone
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-50">
                  Round {nextPendingRound.order}: {nextPendingRound.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onStartAttempt(nextPendingRound)}
                className="px-3 py-1.5 rounded-lg bg-[#0C356A] hover:bg-[#092850] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
              >
                <Play className="size-3 fill-current" />
                <span>Start</span>
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 shrink-0">
              <CheckCircle2 className="size-3.5" />
              <span>All Rounds Fully Prepared</span>
            </div>
          )}
        </div>

        {/* Progress Bar & KPI Stats Row */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-300">
                Overall Interview Readiness
              </span>
              <span className="text-slate-900 dark:text-white font-bold">
                {interview.overallProgress}% Complete
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${interview.overallProgress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
              <span className="text-lg font-bold text-slate-900 dark:text-white block leading-tight">
                {completedRounds.length} / {interview.rounds.length}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Rounds Completed
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
              <span className="text-lg font-bold text-slate-900 dark:text-white block leading-tight">
                {averageScore !== null ? `${averageScore}%` : "—"}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Average Examiner Score
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
              <span className="text-lg font-bold text-slate-900 dark:text-white block leading-tight">
                {interview.attempts.length}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Simulation Attempts
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
              <span className="text-lg font-bold text-slate-900 dark:text-white block leading-tight">
                {applied ? "Applied" : "Not Applied"}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Role Candidacy
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Round-by-Round Diagnostic Breakdown & Application Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 cols: Diagnostic Score Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E1E2D] p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Round-by-Round Evaluation Scores
              </h4>
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              {completedRounds.length} of {sortedRounds.length} evaluated
            </span>
          </div>

          <div className="space-y-3">
            {sortedRounds.map((round) => {
              const score = round.bestScore || 0;
              const isDone = round.status === "completed";

              return (
                <div key={round.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10.5px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center">
                        {round.order}
                      </span>
                      {round.title}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isDone ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {score}% Best Score
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">
                          Not Attempted
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDone
                          ? score >= 85
                            ? "bg-emerald-500"
                            : score >= 70
                              ? "bg-blue-600"
                              : "bg-amber-500"
                          : "bg-transparent"
                      }`}
                      style={{ width: `${isDone ? score : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 col: Student Application Status Widget */}
        <div className="bg-white dark:bg-[#1E1E2D] p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                Recruiter Application
              </span>
              {applied ? (
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {application?.status ?? "APPLIED"}
                </span>
              ) : (
                <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Ready to Apply
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {applied ? "Candidacy Active" : "Submit Role Application"}
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {applied
                ? `Your profile and simulation evaluations were submitted to recruiters on ${
                    application?.appliedAt
                      ? new Date(application.appliedAt).toLocaleDateString()
                      : "file"
                  }.`
                : "When you finish your practice rounds, officially submit your application and interview readiness score directly to institute recruiters."}
            </p>
          </div>

          <div className="pt-2">
            {applied ? (
              <button
                type="button"
                disabled={isWithdrawing}
                onClick={() => application && withdraw(application.id)}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors border border-rose-200 cursor-pointer disabled:opacity-50"
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw Candidacy"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isApplying}
                onClick={() => apply({ interviewId: interview.id })}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-white bg-[#0C356A] hover:bg-[#092850] transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Send className="size-3.5" />
                <span>
                  {isApplying ? "Submitting..." : "Submit Application"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. AI Examiner Simulation Feedback History ── */}
      <div className="bg-white dark:bg-[#1E1E2D] p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="size-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              AI Examiner Attempt Telemetry ({interview.attempts.length})
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            Recorded feedback per simulation session
          </span>
        </div>

        {interview.attempts.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <FileText className="size-7 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No Simulation Attempts Recorded Yet
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Launch simulation rounds in Section 03 above to receive detailed
              AI examiner scoring and personalized feedback.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {interview.attempts.map((att, idx) => {
              const roundObj = interview.rounds.find(
                (r) => r.id === att.roundId,
              );
              return (
                <div
                  key={att.id || idx}
                  className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        {roundObj ? `Round ${roundObj.order}` : "Round"}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {roundObj?.title || "Simulation Round"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(
                          att.completedAt,
                        ).toLocaleDateString()} &bull; {att.durationMinutes}m
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        {att.score}%
                      </span>
                    </div>
                  </div>

                  {att.feedback && (
                    <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                      <MessageSquare className="size-3 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{att.feedback}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
