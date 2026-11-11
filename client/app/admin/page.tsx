"use client";

import React from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight, RefreshCw, TriangleAlert } from "lucide-react";

import { adminApi } from "@/lib/api/admin";
import { queryKeys } from "@/lib/api/queryKeys";
import { getErrorMessage } from "@/lib/api/errors";
import { useAuth } from "../components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Admin overview: role-scoped counters from GET /admin/stats (every status
 * key present, 0-filled server-side) plus quick links into each section.
 * Full state set: skeleton on first load, error panel with retry, content.
 */

interface StatCard {
  key: string;
  label: string;
  value: number | undefined;
  hint: string;
  href: string;
  accent: string;
}

interface StatusSplit {
  label: string;
  counts: Record<string, number>;
  colors: Record<string, string>;
}

const INTERVIEW_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-400",
  ACTIVE: "bg-sky-500",
  COMPLETED: "bg-emerald-500",
  ARCHIVED: "bg-slate-300",
};

const APPLICATION_COLORS: Record<string, string> = {
  APPLIED: "bg-sky-500",
  SHORTLISTED: "bg-amber-500",
  INTERVIEWED: "bg-indigo-500",
  REJECTED: "bg-red-400",
};

const ATTEMPT_COLORS: Record<string, string> = {
  IN_PROGRESS: "bg-amber-500",
  COMPLETED: "bg-emerald-500",
  EVALUATED: "bg-sky-500",
};

const sum = (counts: Record<string, number>): number =>
  Object.values(counts).reduce((total, value) => total + value, 0);

export default function AdminOverviewPage() {
  const { user } = useAuth();

  const statsQuery = useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => adminApi.stats(),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const stats = statsQuery.data?.data;

  const statCards: StatCard[] = [
    {
      key: "admins",
      label: "Admin accounts",
      value: stats?.totalAdmins,
      hint: "Across your scope",
      href: "/admin/accounts",
      accent: "from-[#0C356A] to-[#2E5A9E]",
    },
    {
      key: "students",
      label: "Students",
      value: stats?.totalStudents,
      hint: "Registered candidates",
      href: "/admin/students",
      accent: "from-emerald-500 to-emerald-700",
    },
    {
      key: "institutes",
      label: "Institutes",
      value: stats?.totalInstitutes,
      hint: "In your scope",
      href: "/admin/institutes",
      accent: "from-sky-500 to-sky-700",
    },
    {
      key: "interviews",
      label: "Interviews",
      value: stats ? sum(stats.interviews) : undefined,
      hint: "Published & drafts",
      href: "/admin/interviews",
      accent: "from-indigo-500 to-indigo-700",
    },
    {
      key: "applications",
      label: "Applications",
      value: stats ? sum(stats.applications) : undefined,
      hint: "Pipeline rows",
      href: "/admin/applications",
      accent: "from-amber-500 to-amber-700",
    },
    {
      key: "attempts",
      label: "Attempts",
      value: stats ? sum(stats.attempts) : undefined,
      hint: "Round submissions",
      href: "/admin/attempts",
      accent: "from-rose-500 to-rose-700",
    },
  ];

  const splits: StatusSplit[] = stats
    ? [
        { label: "Interviews by status", counts: stats.interviews, colors: INTERVIEW_COLORS },
        {
          label: "Applications by status",
          counts: stats.applications,
          colors: APPLICATION_COLORS,
        },
        { label: "Attempts by status", counts: stats.attempts, colors: ATTEMPT_COLORS },
      ]
    : [];

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6" data-testid="admin-overview">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Platform overview for everything in your institute scope.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <span className="text-[11.5px] text-slate-400 hidden sm:inline">
              Updated {new Date(stats.generatedAt).toLocaleTimeString()}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => statsQuery.refetch()}
            disabled={statsQuery.isFetching}
            data-testid="admin-stats-refresh"
          >
            <RefreshCw className={cn("size-3.5", statsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      {statsQuery.isPending && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4" data-testid="admin-stats-skeleton">
          {Array.from({ length: 6 }, (_, index) => (
            <Card key={index} className="py-5">
              <CardContent className="space-y-2.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!statsQuery.isPending && statsQuery.isError && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50/50 px-6 py-12 text-center"
          data-testid="admin-stats-error"
        >
          <div className="flex size-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <TriangleAlert className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Couldn&apos;t load the stats</p>
            <p className="text-xs text-slate-500">
              {getErrorMessage(statsQuery.error, "Something went wrong while loading the dashboard.")}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => statsQuery.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!statsQuery.isPending && !statsQuery.isError && stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            {statCards.map((card) => (
              <Link
                key={card.key}
                href={card.href}
                data-testid={`admin-stat-${card.key}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={cn("mb-3 h-1.5 w-9 rounded-full bg-linear-to-r", card.accent)} />
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                  {card.value ?? 0}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11.5px] text-slate-400">
                  {card.hint}
                  <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </p>
              </Link>
            ))}
          </div>

          {/* Pipeline breakdowns */}
          <div className="grid gap-4 md:grid-cols-3">
            {splits.map((split) => (
              <Card key={split.label} className="py-5" data-testid="admin-stat-split">
                <CardHeader className="px-5 pb-0">
                  <CardTitle className="text-sm font-semibold text-slate-700">
                    {split.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pt-3 space-y-3">
                  {Object.entries(split.counts).map(([status, count]) => {
                    const total = sum(split.counts) || 1;
                    const percent = Math.round((count / total) * 100);
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-slate-600">
                            <span
                              className={cn("size-2 rounded-full", split.colors[status] ?? "bg-slate-400")}
                            />
                            {status.replace("_", " ")}
                          </span>
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {count}
                            <span className="ml-1 font-normal text-slate-400">{percent}%</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              split.colors[status] ?? "bg-slate-400",
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
