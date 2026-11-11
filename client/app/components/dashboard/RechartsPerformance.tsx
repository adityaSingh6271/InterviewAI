"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { AnalyticsBarIcon } from "../Icons";
import type { JobInterview } from "@/lib/types/jobInterview";
import type { ServerAttempt } from "@/lib/api/attempts";

type Timeframe = "Last 7 Days" | "Last 30 Days" | "Last 60 Days" | "All Time";

interface RechartsPerformanceProps {
  interviews?: JobInterview[];
  attempts?: ServerAttempt[];
}

interface PerformanceChartPoint {
  name: string;
  attemptScore?: number;
  matchScore?: number;
  progressScore?: number;
}

export default function RechartsPerformance({
  interviews,
  attempts,
}: RechartsPerformanceProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("Last 30 Days");

  const chartData = useMemo<PerformanceChartPoint[]>(() => {
    const now = Date.now();
    const daysLimit =
      timeframe === "Last 7 Days"
        ? 7
        : timeframe === "Last 30 Days"
          ? 30
          : timeframe === "Last 60 Days"
            ? 60
            : Infinity;

    const withinTimeframe = (iso?: string | null) => {
      if (!iso || daysLimit === Infinity) return true;
      const ms = new Date(iso).getTime();
      return !Number.isNaN(ms) && now - ms <= daysLimit * 24 * 60 * 60 * 1000;
    };

    // Prefer evaluated attempt scores when available (real simulation trajectory)
    const scoredAttempts = (attempts ?? []).filter(
      (a) =>
        typeof a.aiScore === "number" &&
        a.aiScore > 0 &&
        withinTimeframe(a.submittedAt ?? a.createdAt),
    );

    if (scoredAttempts.length > 0) {
      return [...scoredAttempts].reverse().map((att, idx) => {
        const ts = att.submittedAt ?? att.createdAt;
        let label = `A${idx + 1}`;
        try {
          label = new Date(ts).toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
          });
        } catch {
          label = `A${idx + 1}`;
        }
        return {
          name: label,
          attemptScore: att.aiScore ?? 0,
        };
      });
    }

    // Otherwise plot real interview match scores / progress from API
    if (!interviews || interviews.length === 0) return [];
    const filteredInterviews = interviews.filter((item) =>
      withinTimeframe(item.createdAt),
    );
    if (filteredInterviews.length === 0) return [];

    return [...filteredInterviews]
      .reverse()
      .map((item, idx) => {
        const matchScore =
          typeof item.matchAnalysis?.overallScore === "number" &&
          item.matchAnalysis.overallScore > 0
            ? item.matchAnalysis.overallScore
            : null;
        const progressScore =
          typeof item.overallProgress === "number" && item.overallProgress > 0
            ? item.overallProgress
            : null;
        if (matchScore === null && progressScore === null) return null;

        let label = `S${idx + 1}`;
        if (item.createdAt) {
          try {
            label = new Date(item.createdAt).toLocaleDateString("en-US", {
              month: "numeric",
              day: "numeric",
            });
          } catch {
            label = `S${idx + 1}`;
          }
        }
        const point: PerformanceChartPoint = { name: label };
        if (matchScore !== null) point.matchScore = matchScore;
        if (progressScore !== null) point.progressScore = progressScore;
        return point;
      })
      .filter((d): d is PerformanceChartPoint => d !== null);
  }, [interviews, attempts, timeframe]);

  const hasAttempts = chartData.some((d) => "attemptScore" in d);
  const hasMatch = chartData.some((d) => "matchScore" in d);
  const hasProgress = chartData.some((d) => "progressScore" in d);
  const hasData = chartData.length > 0 && (hasAttempts || hasMatch || hasProgress);

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xs hover:border-[#0C356A]/40 transition-all duration-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-2.5 mb-3.5 sm:mb-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg bg-[#0C356A] text-white flex items-center justify-center shadow-2xs shrink-0">
            <AnalyticsBarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-semibold text-slate-900 tracking-tight leading-tight">
              Performance Trends
            </h3>
            <p className="text-[11px] sm:text-[11.5px] text-slate-500 mt-0.5">
              {hasAttempts
                ? "Score trajectory across evaluated round attempts"
                : "Resume match & round completion trajectory"}
            </p>
          </div>
        </div>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as Timeframe)}
          className="text-[11.5px] sm:text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 sm:px-3 sm:py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A] cursor-pointer self-start min-[420px]:self-auto"
        >
          <option value="Last 7 Days">Last 7 Days</option>
          <option value="Last 30 Days">Last 30 Days</option>
          <option value="Last 60 Days">Last 60 Days</option>
          <option value="All Time">All Time</option>
        </select>
      </div>

      {/* Chart or Clean Empty State */}
      {!hasData ? (
        <div className="w-full flex-1 min-h-48 sm:min-h-54 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 text-center">
          <p className="text-xs sm:text-[13.5px] font-medium text-slate-600">
            No performance trajectory recorded yet
          </p>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1 max-w-sm">
            Complete interview rounds or run resume match analyses to plot your real score trajectory.
          </p>
        </div>
      ) : (
        <div className="w-full flex-1 min-h-48 sm:min-h-54">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 6, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F1F5F9"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0F172A",
                  borderRadius: "12px",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                }}
                itemStyle={{ color: "#FFFFFF" }}
                labelStyle={{ color: "#FFFFFF" }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              />
              {hasAttempts && (
                <Area
                  type="monotone"
                  dataKey="attemptScore"
                  name="Attempt AI Score"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPrimary)"
                  activeDot={{ r: 5, fill: "#4F46E5", strokeWidth: 2, stroke: "#FFF" }}
                />
              )}
              {hasMatch && (
                <Area
                  type="monotone"
                  dataKey="matchScore"
                  name="Resume Match"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPrimary)"
                  activeDot={{ r: 5, fill: "#4F46E5", strokeWidth: 2, stroke: "#FFF" }}
                />
              )}
              {hasProgress && (
                <Area
                  type="monotone"
                  dataKey="progressScore"
                  name="Completion Progress"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSecondary)"
                  activeDot={{ r: 5, fill: "#10B981", strokeWidth: 2, stroke: "#FFF" }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
