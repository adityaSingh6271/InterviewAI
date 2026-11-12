"use client";

import React from "react";
import type {
  ExtractedJobData,
  ResumeMatchAnalysis,
  InterviewRound,
} from "@/lib/types/jobInterview";
import AnalysisProgress from "./AnalysisProgress";
import ExtractedJobInfo from "./ExtractedJobInfo";
import ResumeMatchCard from "./ResumeMatchCard";
import InterviewPlanPreview from "./InterviewPlanPreview";
import { ArrowRight, RefreshCw } from "lucide-react";
import IconButton from "@/components/common/icon-button";

interface StepAnalysisProps {
  isAnalyzing: boolean;
  isProceeding?: boolean;
  analysisPhase: string;
  extractedData: ExtractedJobData | null;
  matchAnalysis: ResumeMatchAnalysis | null;
  generatedRounds: InterviewRound[];
  roleTitle: string;
  setRoleTitle: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  experienceLevel: string;
  setExperienceLevel: (v: string) => void;
  sessionDurationMinutes: number;
  setSessionDurationMinutes: (v: number) => void;
  onReAnalyze: () => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepAnalysis({
  isAnalyzing,
  isProceeding = false,
  analysisPhase,
  extractedData,
  matchAnalysis,
  generatedRounds,
  roleTitle,
  setRoleTitle,
  company,
  setCompany,
  category,
  setCategory,
  experienceLevel,
  setExperienceLevel,
  sessionDurationMinutes,
  setSessionDurationMinutes,
  onReAnalyze,
  onNext,
  onBack,
}: StepAnalysisProps) {
  if (isAnalyzing) {
    return <AnalysisProgress currentPhaseText={analysisPhase} />;
  }

  if (!extractedData) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#1E1E2D] rounded-2xl border border-slate-200 dark:border-slate-800">
        <p className="text-sm text-slate-500 mb-4">
          No analysis data generated yet.
        </p>
        <IconButton
          onClick={onReAnalyze}
          icon={<RefreshCw className="size-4" />}
          label="Start AI Extraction"
          variant="default"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Extracted Job parameters editor */}
      <ExtractedJobInfo
        extractedData={extractedData}
        roleTitle={roleTitle}
        setRoleTitle={setRoleTitle}
        company={company}
        setCompany={setCompany}
        category={category}
        setCategory={setCategory}
        experienceLevel={experienceLevel}
        setExperienceLevel={setExperienceLevel}
        sessionDurationMinutes={sessionDurationMinutes}
        setSessionDurationMinutes={setSessionDurationMinutes}
      />

      {/* Resume Match Breakdown if present */}
      {matchAnalysis && <ResumeMatchCard matchAnalysis={matchAnalysis} />}

      {/* Generated Multi-round Preview */}
      <InterviewPlanPreview
        rounds={generatedRounds}
        sessionDurationMinutes={sessionDurationMinutes}
        setSessionDurationMinutes={setSessionDurationMinutes}
      />

      {/* Controls */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 bg-white dark:bg-[#1E1E2D] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col min-[420px]:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <IconButton
            type="button"
            action="back"
            label="Back"
            onClick={onBack}
            disabled={isAnalyzing || isProceeding}
            className="w-full sm:w-auto justify-center"
          />
          <IconButton
            type="button"
            action="update"
            label="Re-run AI Analysis"
            variant="outline"
            size="sm"
            onClick={onReAnalyze}
            disabled={isAnalyzing || isProceeding}
            isLoading={isAnalyzing}
            loadingText="Analyzing..."
            className="w-full sm:w-auto justify-center"
          />
        </div>

        <IconButton
          type="button"
          onClick={onNext}
          disabled={isAnalyzing || isProceeding}
          isLoading={isProceeding}
          loadingText="Saving..."
          icon={<ArrowRight className="size-4" />}
          iconPosition="right"
          label="Review & Finalize"
          variant="default"
          className="w-full sm:w-auto justify-center"
        />
      </div>
    </div>
  );
}
