"use client";

import React from "react";
import type {
  ExtractedJobData,
  ResumeMatchAnalysis,
  InterviewRound,
  ResumeReference,
} from "@/lib/types/jobInterview";
import {
  Sparkles,
  Building,
  Clock,
  FileText,
  Rocket,
} from "lucide-react";
import IconButton from "@/components/common/icon-button";

interface StepReviewProps {
  roleTitle: string;
  company: string;
  category: string;
  experienceLevel: string;
  sessionDurationMinutes: number;
  resumeRef: ResumeReference | null;
  extractedData: ExtractedJobData | null;
  matchAnalysis: ResumeMatchAnalysis | null;
  generatedRounds: InterviewRound[];
  isCreating: boolean;
  onCreate: () => void;
  onBack: () => void;
}

export default function StepReview({
  roleTitle,
  company,
  category,
  experienceLevel,
  sessionDurationMinutes,
  resumeRef,
  extractedData,
  matchAnalysis,
  generatedRounds,
  isCreating,
  onCreate,
  onBack,
}: StepReviewProps) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-start sm:items-center gap-3 mb-1.5">
          <div className="p-2 rounded-lg bg-[#0C356A]/10 text-[#0C356A] dark:bg-blue-950/50 dark:text-blue-400 shrink-0">
            <Rocket className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Step 4: Review & Initialize Interview Workspace
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Verify all configured parameters. Creating the workspace will set
              up simulation rounds, prep notes, and progress analytics.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Role & Company Card */}
        <div className="bg-white dark:bg-[#1E1E2D] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
            Target Position
          </span>
          <div>
            <h3 className="text-[14.5px] font-bold text-slate-900 dark:text-white leading-tight">
              {roleTitle}
            </h3>
            <p className="text-[11.5px] text-slate-500 flex items-center gap-1.5 mt-1">
              <Building className="size-3 text-slate-400" />
              {company || "General Industry Interview"}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>{category}</span>
            <span className="font-semibold text-[#0C356A] dark:text-blue-400">
              {experienceLevel}
            </span>
          </div>
        </div>

        {/* Alignment & Resume */}
        <div className="bg-white dark:bg-[#1E1E2D] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
            Candidate Profile
          </span>
          <div>
            <h3 className="text-xs sm:text-[13.5px] font-bold text-slate-900 dark:text-white truncate">
              {resumeRef ? resumeRef.name : "Default Candidate Profile"}
            </h3>
            <p className="text-[11.5px] text-slate-500 flex items-center gap-1.5 mt-1">
              <FileText className="size-3 text-slate-400" />
              {matchAnalysis
                ? `${matchAnalysis.overallScore}% Resume Match (${matchAnalysis.matchLabel})`
                : "No resume attached"}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Eligibility</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
              {matchAnalysis && matchAnalysis.overallScore >= 60
                ? "Eligible"
                : "Needs Practice"}
            </span>
          </div>
        </div>

        {/* Simulation Settings */}
        <div className="bg-white dark:bg-[#1E1E2D] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
            Curriculum Structure
          </span>
          <div>
            <h3 className="text-[14.5px] font-bold text-slate-900 dark:text-white">
              {generatedRounds.length} Interactive Rounds
            </h3>
            <p className="text-[11.5px] text-slate-500 flex items-center gap-1.5 mt-1">
              <Clock className="size-3 text-slate-400" />~
              {sessionDurationMinutes} min session default
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Status</span>
            <span className="font-semibold text-[#0C356A] dark:text-blue-400">
              Ready to Launch
            </span>
          </div>
        </div>
      </div>

      {/* Rounds Breakdown */}
      <div className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Included Rounds in Workspace
        </h4>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {generatedRounds.map((round, idx) => (
            <div
              key={idx}
              className="py-2.5 sm:py-3 flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-md bg-[#0C356A]/10 dark:bg-blue-950/60 text-[#0C356A] dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-white leading-snug">
                    {round.title}
                  </p>
                  <p className="text-[11px] text-slate-400 capitalize">
                    {round.type.replace("_", " ")} &bull;{" "}
                    {round.estimatedDurationMinutes} mins
                  </p>
                </div>
              </div>
              <span className="self-start min-[420px]:self-center shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md whitespace-nowrap">
                Yet to Start
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 p-4 sm:p-5 bg-white dark:bg-[#1E1E2D] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <IconButton
          type="button"
          action="back"
          label="Back to Analysis"
          onClick={onBack}
          disabled={isCreating}
          className="w-full sm:w-auto justify-center"
        />

        <IconButton
          type="button"
          onClick={onCreate}
          disabled={isCreating}
          isLoading={isCreating}
          loadingText="Creating Workspace..."
          icon={<Sparkles className="size-4" />}
          label="Initialize Job Interview Workspace"
          variant="default"
          className="w-full sm:w-auto justify-center whitespace-normal text-center"
        />
      </div>
    </div>
  );
}
