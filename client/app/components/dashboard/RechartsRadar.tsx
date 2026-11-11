"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import type { JobInterview } from "@/lib/types/jobInterview";

interface RechartsRadarProps {
  interviews?: JobInterview[];
}

export default function RechartsRadar({ interviews }: RechartsRadarProps) {
  const { radarData, overallScoreLabel, hasData } = useMemo(() => {
    if (!interviews || interviews.length === 0) {
      return { radarData: [], overallScoreLabel: "—", hasData: false };
    }

    // Group real scores by category first
    const byCategory = new Map<string, number[]>();
    const perInterview: { subject: string; score: number }[] = [];

    for (const item of interviews) {
      const score =
        item.matchAnalysis?.overallScore ??
        (typeof item.overallProgress === "number" && item.overallProgress > 0
          ? item.overallProgress
          : null);
      if (score === null || score <= 0) continue;

      const cat = item.category || "General";
      const list = byCategory.get(cat) ?? [];
      list.push(score);
      byCategory.set(cat, list);

      const label = (item.targetRole || item.title || "Interview").slice(0, 18);
      perInterview.push({ subject: label, score });
    }

    const allScores = perInterview.map((d) => d.score);
    if (allScores.length === 0) {
      return { radarData: [], overallScoreLabel: "—", hasData: false };
    }

    const overallAvg = Math.round(
      allScores.reduce((a, b) => a + b, 0) / allScores.length,
    );

    // Prefer category axes if 3+ distinct categories exist; otherwise plot up to 6 interviews
    const categoryAxes = Array.from(byCategory.entries()).map(([cat, scores]) => ({
      subject: cat.slice(0, 18),
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));

    const data =
      categoryAxes.length >= 3
        ? categoryAxes.slice(0, 6)
        : perInterview.length >= 3
          ? perInterview.slice(0, 6)
          : [];

    if (data.length === 0) {
      return {
        radarData: [],
        overallScoreLabel: `${overallAvg}% Avg`,
        hasData: false,
      };
    }

    return {
      radarData: data,
      overallScoreLabel: `${overallAvg}% Overall`,
      hasData: true,
    };
  }, [interviews]);

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xs hover:border-[#0C356A]/40 transition-all duration-200 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-[14px] sm:text-[15px] font-semibold text-slate-900 tracking-tight leading-tight">
            Competency Radar
          </h3>
          <p className="text-[11px] sm:text-[11.5px] text-slate-500 font-normal mt-0.5">
            Track &amp; role readiness comparison
          </p>
        </div>
        <span
          className={`text-[10.5px] sm:text-[11.5px] font-medium px-2.5 py-0.5 rounded-full shrink-0 border ${
            hasData
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-50 text-slate-500 border-slate-200"
          }`}
        >
          {overallScoreLabel}
        </span>
      </div>

      {!hasData ? (
        <div className="w-full flex-1 min-h-52 sm:min-h-65 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 text-center">
          <p className="text-xs sm:text-[13.5px] font-medium text-slate-600">
            Not enough data points for radar comparison
          </p>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1 max-w-xs">
            Score at least 3 interviews or tracks to render your multi-axis readiness radar.
          </p>
        </div>
      ) : (
        <div className="w-full flex-1 min-h-52 sm:min-h-65">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              data={radarData}
              outerRadius="58%"
              margin={{ top: 8, right: 14, bottom: 8, left: 14 }}
            >
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#475569", fontSize: 9.5, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "#94A3B8", fontSize: 8.5 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0F172A",
                  borderRadius: "12px",
                  border: "none",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#FFFFFF" }}
                labelStyle={{ color: "#FFFFFF" }}
              />
              <Radar
                name="Readiness Score"
                dataKey="score"
                stroke="#4540DB"
                fill="#4540DB"
                fillOpacity={0.35}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
