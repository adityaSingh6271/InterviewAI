"use client";

import React from "react";
import type { ResumeMatchAnalysis } from "@/lib/types/jobInterview";
import { CheckCircle2, AlertTriangle, Lightbulb, Target } from "lucide-react";

interface ResumeMatchCardProps {
  matchAnalysis: ResumeMatchAnalysis;
}

export default function ResumeMatchCard({ matchAnalysis }: ResumeMatchCardProps) {
  const {
    overallScore = 0,
    matchLabel = "moderate",
    matchedSkills = [],
    missingSkills = [],
    experienceAlignment,
    improvementAreas = [],
  } = matchAnalysis;

  const getScoreColor = () => {
    if (overallScore >= 75) return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800";
    if (overallScore >= 50) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";
    return "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800";
  };

  return (
    <div className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
      {/* Header Match Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#0C356A]/10 text-[#0C356A] dark:bg-blue-950/50 dark:text-blue-400">
            <Target className="size-4" />
          </div>
          <div>
            <h3 className="text-[14.5px] sm:text-base font-bold text-slate-900 dark:text-white">
              Resume Alignment & Skill Gap Analysis
            </h3>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
              Evaluated against mandatory job requirements and expectations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${getScoreColor()}`}>
            <span className="text-xl font-bold">{overallScore}%</span>
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {matchLabel} Match
            </span>
          </div>
        </div>
      </div>

      {/* Experience Alignment Summary */}
      {experienceAlignment?.summary && (
        <div className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
            {experienceAlignment.summary}
          </p>
        </div>
      )}

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Matched Skills */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4" />
            <span>Matched Strengths ({matchedSkills.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
              >
                <CheckCircle2 className="size-3 text-emerald-500" />
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Missing / Focus Areas */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4" />
            <span>Focus & Improvement Areas ({missingSkills.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missingSkills.map((gap, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
              >
                <AlertTriangle className="size-3 text-amber-500" />
                {gap.skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Actionable Recommendations */}
      {improvementAreas && improvementAreas.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <Lightbulb className="size-4 text-indigo-500" />
            <span>AI Preparation Tips for this Interview</span>
          </div>
          <div className="space-y-2">
            {improvementAreas.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs"
              >
                <span className="font-semibold text-indigo-900 dark:text-indigo-300 block mb-0.5">
                  {item.title}
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {item.suggestion}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
