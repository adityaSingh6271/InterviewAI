"use client";

import React from "react";
import Link from "next/link";
import { useJobInterviewCreation } from "@/lib/hooks/useJobInterviewCreation";
import StepJobDescription from "@/app/components/dashboard/job-interviews/create/StepJobDescription";
import StepResume from "@/app/components/dashboard/job-interviews/create/StepResume";
import StepAnalysis from "@/app/components/dashboard/job-interviews/create/StepAnalysis";
import StepReview from "@/app/components/dashboard/job-interviews/create/StepReview";
import { ArrowLeft, Check, Sparkles } from "lucide-react";

const WIZARD_STEPS = [
  { step: 1, title: "Job Description", desc: "Paste JD & requirements" },
  { step: 2, title: "Resume (Optional)", desc: "Match & gap analysis" },
  { step: 3, title: "AI Analysis", desc: "Extracted parameters & rounds" },
  { step: 4, title: "Review & Launch", desc: "Confirm workspace" },
];

interface PageProps {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default function CreateJobInterviewPage(props: PageProps = {}) {
  if (props.params) React.use(props.params);
  if (props.searchParams) React.use(props.searchParams);
  const {
    currentStep,
    goToStep,
    jobDescription,
    setJobDescription,
    resumeRef,
    setResumeRef,
    isAnalyzing,
    analysisPhase,
    runAnalysis,
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
    isCreating,
    createFinalInterview,
  } = useJobInterviewCreation();

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/interviews"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Interviews
          </Link>
          <h1 className="text-2xl sm:text-[26px] font-semibold text-slate-900 flex items-center gap-2.5 tracking-tight">
            Create Job Interview
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <Sparkles className="size-3" />
              AI Powered
            </span>
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 font-normal mt-0.5">
            Build a comprehensive simulation curriculum tailored directly to any role&apos;s actual requirements.
          </p>
        </div>
      </div>

      {/* Step Progress Stepper */}
      <div className="bg-white dark:bg-[#1E1E2D] p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {WIZARD_STEPS.map((s) => {
            const isDone = currentStep > s.step;
            const isCurrent = currentStep === s.step;

            return (
              <div
                key={s.step}
                onClick={() => {
                  if (s.step < currentStep) goToStep(s.step as 1 | 2 | 3 | 4);
                }}
                className={`flex items-center gap-2.5 p-2 sm:p-2.5 rounded-lg border transition-all ${
                  isCurrent
                    ? "bg-[#0C356A]/10 dark:bg-[#0C356A]/30 border-[#0C356A]/30 dark:border-[#0C356A]/50"
                    : isDone
                    ? "cursor-pointer hover:bg-[#F1F6FD] hover:border-[#B8C7DA] dark:hover:bg-slate-800/40 border-slate-200/80 dark:border-slate-800"
                    : "opacity-60 border-slate-100 dark:border-slate-800"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-[#0C356A] text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {isDone ? <Check className="size-3.5 stroke-3" /> : s.step}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-semibold truncate ${
                      isCurrent
                        ? "text-[#0C356A] dark:text-blue-200 font-bold"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {s.title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wizard Step Content */}
      <div>
        {currentStep === 1 && (
          <StepJobDescription
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            onNext={() => goToStep(2)}
          />
        )}

        {currentStep === 2 && (
          <StepResume
            resumeRef={resumeRef}
            setResumeRef={setResumeRef}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
            isAnalyzing={isAnalyzing}
          />
        )}

        {currentStep === 3 && (
          <StepAnalysis
            isAnalyzing={isAnalyzing}
            analysisPhase={analysisPhase}
            extractedData={extractedData}
            matchAnalysis={matchAnalysis}
            generatedRounds={generatedRounds}
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
            onReAnalyze={runAnalysis}
            onNext={() => goToStep(4)}
            onBack={() => goToStep(2)}
          />
        )}

        {currentStep === 4 && (
          <StepReview
            roleTitle={roleTitle}
            company={company}
            category={category}
            experienceLevel={experienceLevel}
            sessionDurationMinutes={sessionDurationMinutes}
            resumeRef={resumeRef}
            extractedData={extractedData}
            matchAnalysis={matchAnalysis}
            generatedRounds={generatedRounds}
            isCreating={isCreating}
            onCreate={createFinalInterview}
            onBack={() => goToStep(3)}
          />
        )}
      </div>
    </div>
  );
}
