"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight02Icon,
  Sorting05Icon,
  EyeIcon,
  PlayIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import type { JobInterview } from "@/lib/types/jobInterview";
import IconButton from "@/components/common/icon-button";

interface RecentSessionsTableProps {
  interviews?: JobInterview[];
  isLoading?: boolean;
}

interface InterviewRowModel {
  id: string;
  role: string;
  company: string;
  category: string;
  score: number | null;
  duration: string;
  date: string;
}

export default function RecentSessionsTable({
  interviews = [],
  isLoading = false,
}: RecentSessionsTableProps) {
  const router = useRouter();

  const displayItems: InterviewRowModel[] = useMemo(() => {
    if (!interviews || interviews.length === 0) return [];

    return interviews.map((interview) => {
      const totalRounds =
        interview.totalRounds ?? interview.rounds?.length ?? 0;
      const completedRounds = interview.completedRounds ?? 0;

      let score: number | null = null;
      if (
        typeof interview.matchAnalysis?.overallScore === "number" &&
        interview.matchAnalysis.overallScore > 0
      ) {
        score = interview.matchAnalysis.overallScore;
      } else if (totalRounds > 0 && completedRounds > 0) {
        score = Math.round((completedRounds / totalRounds) * 100);
      } else if (
        typeof interview.overallProgress === "number" &&
        interview.overallProgress > 0
      ) {
        score = interview.overallProgress;
      }

      let dateFormatted = "—";
      if (interview.createdAt) {
        try {
          const date = new Date(interview.createdAt);
          const now = new Date();
          const diffDays = Math.floor(
            (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (diffDays === 0) dateFormatted = "Today";
          else if (diffDays === 1) dateFormatted = "Yesterday";
          else if (diffDays < 7) dateFormatted = `${diffDays}d ago`;
          else {
            dateFormatted = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }
        } catch {
          dateFormatted = "—";
        }
      }

      return {
        id: interview.id,
        role: interview.targetRole || interview.title,
        company: interview.company || "Workspace",
        category: interview.category || "General",
        score,
        duration: interview.sessionDurationMinutes
          ? `${interview.sessionDurationMinutes} mins`
          : "—",
        date: dateFormatted,
      };
    });
  }, [interviews]);

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xs hover:border-[#0C356A]/40 transition-all duration-200 h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3.5 sm:mb-4">
        <div>
          <h3 className="text-[14px] sm:text-[15px] font-semibold text-slate-900 tracking-tight leading-tight">
            Recent Interview Workspaces
          </h3>
          <p className="text-[11px] sm:text-[11.5px] text-slate-500 font-normal mt-0.5">
            Active workspaces, match scores &amp; round progress
          </p>
        </div>
        <Link
          href="/dashboard/interviews"
          className="text-[11.5px] sm:text-[12.5px] font-medium text-[#0C356A] hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <span>View All</span>
          <HugeiconsIcon icon={ArrowRight02Icon} className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-3 py-4 flex-1">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-12 w-full bg-slate-100/80 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            No interview workspaces recorded yet
          </p>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1 max-w-xs">
            Create a job interview or start a practice round to see your progress here.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card List (xs to sm) */}
          <div className="block sm:hidden space-y-2 divide-y divide-slate-100">
            {displayItems.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/dashboard/interviews/${item.id}`)}
                className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                      {item.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal truncate">
                      {item.date}
                    </span>
                  </div>
                  <div className="font-medium text-slate-900 text-[13px] truncate group-hover:text-[#0C356A] transition-colors">
                    {item.role}
                  </div>
                  <div className="text-[11.5px] text-slate-500 font-normal mt-0.5 flex items-center gap-2">
                    <span>{item.company}</span>
                    <span>•</span>
                    <span>{item.duration}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-[#0C356A]">
                      {item.score != null ? `${item.score}%` : "—"}
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Score
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-[#0C356A]/10 text-[#0C356A] flex items-center justify-center">
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop / Tablet Table (sm and up) */}
          <div className="hidden sm:block overflow-x-auto flex-1">
            <table className="w-full text-left text-sm min-w-120">
              <thead>
                <tr className="border-b border-slate-200 text-[11.5px] font-semibold text-slate-600">
                  <th className="py-3 px-3 font-semibold w-24 text-left">
                    Action
                  </th>
                  <th className="py-3 px-4 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      Session &amp; Role{" "}
                      <HugeiconsIcon
                        icon={Sorting05Icon}
                        className="size-3 text-slate-400"
                      />
                    </span>
                  </th>
                  <th className="py-3 px-4 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      Category{" "}
                      <HugeiconsIcon
                        icon={Sorting05Icon}
                        className="size-3 text-slate-400"
                      />
                    </span>
                  </th>
                  <th className="py-3 px-4 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      Score{" "}
                      <HugeiconsIcon
                        icon={Sorting05Icon}
                        className="size-3 text-slate-400"
                      />
                    </span>
                  </th>
                  <th className="py-3 px-4 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      Duration{" "}
                      <HugeiconsIcon
                        icon={Sorting05Icon}
                        className="size-3 text-slate-400"
                      />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() =>
                      router.push(`/dashboard/interviews/${item.id}`)
                    }
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-3 text-left">
                      <div className="flex items-center gap-1">
                        <IconButton
                          type="button"
                          icon={PlayIcon}
                          variant="ghost"
                          size="icon-sm"
                          showLabel={false}
                          tooltip="Practice Session"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/interviews/${item.id}`);
                          }}
                          className="text-[#0C356A] hover:bg-indigo-50"
                        />
                        <IconButton
                          type="button"
                          icon={EyeIcon}
                          variant="ghost"
                          size="icon-sm"
                          showLabel={false}
                          tooltip="Open Workspace"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/interviews/${item.id}`);
                          }}
                          className="text-slate-500 hover:text-[#0C356A] hover:bg-slate-100"
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 text-[13px] leading-tight group-hover:text-[#0C356A] transition-colors">
                        {item.role}
                      </div>
                      <div className="text-[11.5px] text-slate-500 font-normal mt-0.5">
                        {item.date} · {item.company}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[12.5px] font-medium text-slate-800 min-w-9">
                          {item.score != null ? `${item.score}%` : "—"}
                        </span>
                        <div className="w-16 sm:w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0">
                          <div
                            className="h-full bg-[#0C356A] rounded-full transition-all duration-500"
                            style={{ width: `${item.score ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[12px] text-slate-600 font-normal whitespace-nowrap">
                      {item.duration}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
