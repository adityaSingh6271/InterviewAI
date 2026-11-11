"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { JobInterview } from "@/lib/types/jobInterview";

const COLORS = ["#4F46E5", "#10B981", "#8B5CF6", "#F59E0B", "#06B6D4"];

interface RechartsBarScoreProps {
  interviews?: JobInterview[];
}

export default function RechartsBarScore({ interviews }: RechartsBarScoreProps) {
  const chartData = useMemo(() => {
    if (!interviews || interviews.length === 0) return [];

    const map = new Map<string, number[]>();
    for (const item of interviews) {
      const cat = item.category || "General";
      const score =
        item.matchAnalysis?.overallScore ??
        (typeof item.overallProgress === "number" && item.overallProgress > 0
          ? item.overallProgress
          : null);
      if (score !== null && score > 0) {
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push(score);
      }
    }

    if (map.size === 0) return [];

    return Array.from(map.entries()).map(([category, scores]) => {
      const avgScore = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length,
      );
      return { category, avgScore };
    });
  }, [interviews]);

  const hasData = chartData.length > 0;

  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h3 className="text-[14.5px] sm:text-[15.5px] font-bold text-slate-900 tracking-tight leading-tight">
            Average Score by Track
          </h3>
          <p className="text-[11.5px] text-slate-500 mt-0.5">
            Category benchmark comparison
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="w-full h-56 sm:h-64 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 text-center">
          <p className="text-xs sm:text-[13.5px] font-medium text-slate-600">
            No track benchmark data available yet —
          </p>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1 max-w-xs">
            Complete interviews across Engineering, AI, or Design tracks to view comparative category benchmarks.
          </p>
        </div>
      ) : (
        <div className="w-full h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F1F5F9"
                vertical={false}
              />
              <XAxis
                dataKey="category"
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
                }}
                itemStyle={{
                  color: "#FFFFFF",
                }}
                labelStyle={{
                  color: "#FFFFFF",
                }}
                formatter={(value) => [`${value ?? 0}% Avg Score`, "Score"]}
              />
              <Bar dataKey="avgScore" radius={[8, 8, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
