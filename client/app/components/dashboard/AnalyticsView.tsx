"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import RechartsPerformance from "./RechartsPerformance";
import RechartsRadar from "./RechartsRadar";
import RechartsBarScore from "./RechartsBarScore";
import { Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { useJobInterviews } from "@/lib/hooks/useJobInterviews";
import { useAuth } from "../providers/AuthProvider";
import { attemptsApi } from "@/lib/api/attempts";
import { queryKeys } from "@/lib/api/queryKeys";

export default function AnalyticsView() {
  const { interviews } = useJobInterviews();
  const { user } = useAuth();

  const attemptsQuery = useQuery({
    queryKey: queryKeys.attempts.list({ page: 1, limit: 100 }),
    queryFn: async () => (await attemptsApi.list({ page: 1, limit: 100 })).data,
    enabled: Boolean(user),
  });
  const attempts = useMemo(() => attemptsQuery.data ?? [], [attemptsQuery.data]);

  const {
    overallScore,
    avgAttemptScore,
    avgMatchScore,
    completedRoundsCount,
    totalRoundsCount,
    telemetryStats,
    diagnosticSummary,
    strongestLabel,
    growthLabel,
  } = useMemo(() => {
    const attemptScores = attempts
      .map((a) => a.aiScore)
      .filter((s): s is number => typeof s === "number" && s > 0);
    const attemptAvg =
      attemptScores.length > 0
        ? Math.round(
            attemptScores.reduce((a, b) => a + b, 0) / attemptScores.length,
          )
        : null;

    const matchScores = interviews
      .map((i) => i.matchAnalysis?.overallScore)
      .filter((s): s is number => typeof s === "number" && s > 0);
    const matchAvg =
      matchScores.length > 0
        ? Math.round(
            matchScores.reduce((a, b) => a + b, 0) / matchScores.length,
          )
        : null;

    const submittedAttempts = attempts.filter(
      (a) => a.status !== "IN_PROGRESS",
    );
    const durationsMin = submittedAttempts
      .map((a) => {
        if (!a.submittedAt || !a.startedAt) return null;
        const mins =
          (new Date(a.submittedAt).getTime() -
            new Date(a.startedAt).getTime()) /
          60000;
        return Number.isFinite(mins) && mins >= 0 ? Math.max(1, Math.round(mins)) : null;
      })
      .filter((m): m is number => m !== null);
    const avgDurationMin =
      durationsMin.length > 0
        ? Math.round(
            durationsMin.reduce((a, b) => a + b, 0) / durationsMin.length,
          )
        : null;

    const completedRounds = interviews.reduce(
      (sum, item) => sum + (item.completedRounds ?? 0),
      0,
    );
    const totalRounds = interviews.reduce(
      (sum, item) => sum + (item.totalRounds ?? item.rounds?.length ?? 0),
      0,
    );

    const effectiveOverall = attemptAvg ?? matchAvg;

    const latestAttemptFeedback = attempts.find((a) => Boolean(a.aiFeedback))?.aiFeedback;
    const latestAlignmentSummary = interviews.find(
      (i) => Boolean(i.matchAnalysis?.experienceAlignment?.summary),
    )?.matchAnalysis?.experienceAlignment?.summary;

    const matchedSkills = Array.from(
      new Set(
        interviews.flatMap((i) => i.matchAnalysis?.matchedSkills ?? []),
      ),
    );
    const missingSkills = Array.from(
      new Set(
        interviews.flatMap(
          (i) => i.matchAnalysis?.missingSkills?.map((g) => g.skill) ?? [],
        ),
      ),
    );

    return {
      overallScore: effectiveOverall,
      avgAttemptScore: attemptAvg,
      avgMatchScore: matchAvg,
      completedRoundsCount: completedRounds,
      totalRoundsCount: totalRounds,
      telemetryStats: [
        {
          label: "Average AI Score",
          value: attemptAvg !== null ? `${attemptAvg}%` : "—",
          status:
            attemptAvg === null
              ? "No evaluated attempts"
              : attemptAvg >= 85
                ? "Strong"
                : attemptAvg >= 70
                  ? "Proficient"
                  : "Needs Practice",
          color:
            attemptAvg !== null
              ? "text-emerald-600 bg-emerald-50"
              : "text-slate-500 bg-slate-50",
        },
        {
          label: "Submitted Attempts",
          value: submittedAttempts.length > 0 ? String(submittedAttempts.length) : "0",
          status: submittedAttempts.length > 0 ? "Recorded" : "No submissions",
          color:
            submittedAttempts.length > 0
              ? "text-indigo-600 bg-indigo-50"
              : "text-slate-500 bg-slate-50",
        },
        {
          label: "Avg Round Duration",
          value: avgDurationMin !== null ? `${avgDurationMin} min` : "—",
          status: avgDurationMin !== null ? "Measured" : "No timing data",
          color:
            avgDurationMin !== null
              ? "text-sky-600 bg-sky-50"
              : "text-slate-500 bg-slate-50",
        },
        {
          label: "Resume Match Avg",
          value: matchAvg !== null ? `${matchAvg}%` : "—",
          status:
            matchAvg === null
              ? "No resume analysis"
              : matchAvg >= 80
                ? "Strong Fit"
                : "Moderate Fit",
          color:
            matchAvg !== null
              ? "text-purple-600 bg-purple-50"
              : "text-slate-500 bg-slate-50",
        },
      ],
      diagnosticSummary:
        latestAttemptFeedback ??
        latestAlignmentSummary ??
        null,
      strongestLabel:
        matchedSkills.length > 0
          ? `Matched skills: ${matchedSkills.slice(0, 5).join(", ")}`
          : null,
      growthLabel:
        missingSkills.length > 0
          ? `Skill focus areas: ${missingSkills.slice(0, 5).join(", ")}`
          : null,
    };
  }, [attempts, interviews]);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-[26px] md:text-[28px] font-semibold text-slate-900 tracking-tight leading-tight">
          Performance &amp; Evaluation Analytics
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-normal mt-0.5">
          Real-time evaluation scores, round progress, and resume calibration metrics.
        </p>
      </div>

      {/* Top 4 Real Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {telemetryStats.map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-[#0C356A]/40 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="text-[11.5px] sm:text-[12.5px] font-medium text-slate-600">
              {stat.label}
            </div>
            <div className="text-lg min-[380px]:text-xl sm:text-2xl font-semibold text-slate-900 mt-1.5 leading-tight">
              {stat.value}
            </div>
            <span
              className={`inline-block text-[10.5px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full mt-2.5 self-start ${stat.color} border border-slate-200/60`}
            >
              {stat.status}
            </span>
          </div>
        ))}
      </div>

      {/* Recharts Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-8 flex flex-col">
          <RechartsPerformance interviews={interviews} attempts={attempts} />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <RechartsRadar interviews={interviews} />
        </div>
      </div>

      {/* Track Benchmarks and Diagnostic Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-6 flex flex-col">
          <RechartsBarScore interviews={interviews} />
        </div>

        <div className="lg:col-span-6 bg-linear-to-br from-[#0C356A] via-[#092B57] to-slate-900 rounded-xl p-5 sm:p-6 text-white shadow-2xs flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-blue-200 text-[11px] font-medium uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                  <span>AI Executive Diagnostic Synthesis</span>
                </div>
                <span
                  className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full border ${
                    overallScore
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                      : "bg-slate-500/20 text-slate-300 border-slate-400/30"
                  }`}
                >
                  {avgAttemptScore !== null
                    ? "Evaluated"
                    : avgMatchScore !== null
                      ? "Resume Calibrated"
                      : "Pending Session"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold tracking-tight mb-2">
                Candidate Readiness: {overallScore !== null ? `${overallScore}%` : "—"}
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed font-normal">
                {diagnosticSummary
                  ? diagnosticSummary
                  : "No diagnostic synthesis available yet — complete an interview round or resume analysis to populate real AI evaluation feedback."}
              </p>
            </div>

            {/* Real Metrics Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 sm:p-3">
                <div className="text-[11px] text-blue-200 font-medium truncate">
                  Attempt Avg
                </div>
                <div className="text-sm sm:text-base font-semibold text-white mt-0.5">
                  {avgAttemptScore !== null ? `${avgAttemptScore}%` : "—"}
                </div>
                <div className="w-full bg-white/10 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: avgAttemptScore !== null ? `${avgAttemptScore}%` : "0%" }}
                  />
                </div>
                <div className="text-[10px] text-slate-300 mt-1 font-normal">
                  {avgAttemptScore !== null ? "AI Scored" : "Not attempted"}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 sm:p-3">
                <div className="text-[11px] text-blue-200 font-medium truncate">
                  Resume Match
                </div>
                <div className="text-sm sm:text-base font-semibold text-white mt-0.5">
                  {avgMatchScore !== null ? `${avgMatchScore}%` : "—"}
                </div>
                <div className="w-full bg-white/10 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-400 h-full rounded-full transition-all duration-500"
                    style={{ width: avgMatchScore !== null ? `${avgMatchScore}%` : "0%" }}
                  />
                </div>
                <div className="text-[10px] text-slate-300 mt-1 font-normal">
                  {avgMatchScore !== null ? "JD Alignment" : "No resume"}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 sm:p-3">
                <div className="text-[11px] text-blue-200 font-medium truncate">
                  Rounds Done
                </div>
                <div className="text-sm sm:text-base font-semibold text-white mt-0.5">
                  {totalRoundsCount > 0 ? `${completedRoundsCount}/${totalRoundsCount}` : "—"}
                </div>
                <div className="w-full bg-white/10 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div
                    className="bg-purple-400 h-full rounded-full transition-all duration-500"
                    style={{
                      width:
                        totalRoundsCount > 0
                          ? `${Math.round((completedRoundsCount / totalRoundsCount) * 100)}%`
                          : "0%",
                    }}
                  />
                </div>
                <div className="text-[10px] text-slate-300 mt-1 font-normal">
                  {totalRoundsCount > 0 ? "Progress" : "No rounds"}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3.5 mt-3.5 border-t border-white/10 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {strongestLabel ?? "No matched competencies logged yet"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-blue-200">
              <ArrowRight className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              <span>
                {growthLabel ?? "Complete resume analysis or practice rounds to identify focus areas"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
