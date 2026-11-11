"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import IconButton from "@/components/common/icon-button";
import { PlayIcon } from "@hugeicons/core-free-icons";
import RechartsPerformance from "../components/dashboard/RechartsPerformance";
import RechartsRadar from "../components/dashboard/RechartsRadar";
import InsightsCard from "../components/dashboard/InsightsCard";
import RecentSessionsTable from "../components/dashboard/RecentSessionsTable";
import { useJobInterviews } from "@/lib/hooks/useJobInterviews";
import { useAuth } from "@/app/components/providers/AuthProvider";
import { attemptsApi } from "@/lib/api/attempts";
import { queryKeys } from "@/lib/api/queryKeys";

interface DashboardPageProps {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default function DashboardHomePage(props: DashboardPageProps = {}) {
  if (props.params) {
    React.use(props.params);
  }
  if (props.searchParams) {
    React.use(props.searchParams);
  }
  const router = useRouter();
  const { interviews, loading: interviewsLoading, total } = useJobInterviews();
  const { user } = useAuth();
  const canCreate = Boolean(user);

  const attemptsQuery = useQuery({
    queryKey: queryKeys.attempts.list({ page: 1, limit: 100 }),
    queryFn: async () => (await attemptsApi.list({ page: 1, limit: 100 })).data,
    enabled: Boolean(user),
  });
  const attempts = useMemo(() => attemptsQuery.data ?? [], [attemptsQuery.data]);

  const handleStartQuickPractice = () => {
    if (interviews.length > 0) {
      router.push(`/dashboard/interviews/${interviews[0].id}`);
    } else {
      router.push("/dashboard/interviews/new");
    }
  };

  const readinessScore = useMemo(() => {
    const attemptScores = attempts
      .map((a) => a.aiScore)
      .filter((s): s is number => typeof s === "number" && s > 0);
    if (attemptScores.length > 0) {
      const avg = Math.round(
        attemptScores.reduce((a, b) => a + b, 0) / attemptScores.length,
      );
      return `${avg}%`;
    }

    const matchScores = interviews
      .map((i) => i.matchAnalysis?.overallScore)
      .filter((s): s is number => typeof s === "number" && s > 0);
    if (matchScores.length > 0) {
      const avg = Math.round(
        matchScores.reduce((a, b) => a + b, 0) / matchScores.length,
      );
      return `${avg}%`;
    }

    return "—";
  }, [attempts, interviews]);

  const completedRoundsCount = useMemo(() => {
    const submittedAttempts = attempts.filter((a) => a.status !== "IN_PROGRESS").length;
    if (submittedAttempts > 0) return submittedAttempts;
    return interviews.reduce(
      (sum, item) => sum + (item.completedRounds ?? 0),
      0,
    );
  }, [attempts, interviews]);

  const latestFeedback = useMemo(() => {
    const withFeedback = attempts.find((a) => Boolean(a.aiFeedback));
    if (withFeedback?.aiFeedback) return withFeedback.aiFeedback;
    const withAlignment = interviews.find(
      (i) => Boolean(i.matchAnalysis?.experienceAlignment?.summary),
    );
    return withAlignment?.matchAnalysis?.experienceAlignment?.summary ?? null;
  }, [attempts, interviews]);

  return (
    <div className="w-full space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Greeting & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-[20px] min-[380px]:text-[22px] sm:text-[26px] md:text-[28px] font-semibold text-slate-900 tracking-tight leading-tight">
            Welcome back, {user?.name || "Candidate"}
          </h1>
          <p className="text-[12px] min-[380px]:text-[13px] sm:text-[14px] text-slate-500 font-normal mt-0.5 leading-normal">
            Here is an overview of your interview performance and AI diagnostic
            telemetry.
          </p>
        </div>

        <div className="flex flex-col min-[390px]:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
          <IconButton
            type="button"
            icon={PlayIcon}
            label="Practice Now"
            variant="default"
            onClick={handleStartQuickPractice}
            className="w-full min-[390px]:w-auto justify-center text-xs sm:text-sm py-2 sm:py-2.5 px-3.5 sm:px-4 shadow-xs"
          />

          {canCreate && (
            <Link
              href="/dashboard/interviews/new"
              className="w-full min-[390px]:w-auto block"
            >
              <IconButton
                type="button"
                action="create"
                label="Create Job Interview"
                className="w-full min-[390px]:w-auto justify-center text-xs sm:text-sm py-2 sm:py-2.5 px-3.5 sm:px-4 shadow-xs"
              />
            </Link>
          )}
        </div>
      </div>

      {/* Bento Grid Row 1: AI Coach Diagnostic + Performance Trends AreaChart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 flex flex-col min-h-75">
          <InsightsCard
            sessionCount={total ?? interviews.length}
            readinessScore={readinessScore}
            completedRounds={completedRoundsCount}
            diagnosticMessage={latestFeedback}
          />
        </div>
        <div className="lg:col-span-7 flex flex-col min-h-75">
          <RechartsPerformance interviews={interviews} attempts={attempts} />
        </div>
      </div>

      {/* Bento Grid Row 2: Recent Practice Sessions Table + Competency Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 flex flex-col min-h-80">
          <RecentSessionsTable
            interviews={interviews.slice(0, 4)}
            isLoading={interviewsLoading}
          />
        </div>
        <div className="lg:col-span-5 flex flex-col min-h-80">
          <RechartsRadar interviews={interviews} />
        </div>
      </div>
    </div>
  );
}
