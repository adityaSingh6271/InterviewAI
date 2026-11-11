"use client";

import React from "react";
import { FileText, ArrowRight } from "lucide-react";
import IconButton from "@/components/common/icon-button";

interface StepJobDescriptionProps {
  jobDescription: string;
  setJobDescription: (v: string) => void;
  onNext: () => void;
  isLoading?: boolean;
}

export default function StepJobDescription({
  jobDescription,
  setJobDescription,
  onNext,
  isLoading = false,
}: StepJobDescriptionProps) {
  const isValid = jobDescription.trim().length >= 30;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#0C356A]/10 text-[#0C356A]">
            <FileText className="size-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Step 1: Paste Job Description
            </h2>
            <p className="text-xs sm:text-[12.5px] text-slate-500">
              Provide the job posting text. Our AI will automatically detect the role, required technologies, experience level, and generate tailored simulation rounds.
            </p>
          </div>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Job Description Content *
          </label>
          <span className="text-xs text-slate-400">
            {jobDescription.length} characters (min 30)
          </span>
        </div>

        <textarea
          rows={10}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste full job description including responsibilities, required qualifications, and tech stack..."
          className="w-full p-4 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A] font-mono leading-relaxed"
        />

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-500">
            Next: You can optionally attach your resume for compatibility gap analysis.
          </p>

          <IconButton
            type="button"
            onClick={onNext}
            disabled={!isValid || isLoading}
            isLoading={isLoading}
            loadingText="Saving..."
            icon={<ArrowRight className="size-4" />}
            iconPosition="right"
            label="Continue to Resume"
            variant="default"
          />
        </div>
      </div>
    </div>
  );
}
