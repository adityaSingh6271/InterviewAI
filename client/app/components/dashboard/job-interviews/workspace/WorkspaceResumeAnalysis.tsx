"use client";

import React, { useRef, useState } from "react";
import type { JobInterview, ResumeReference } from "@/lib/types/jobInterview";
import ResumeMatchCard from "../create/ResumeMatchCard";
import { FileText, AlertCircle, UploadCloud, Loader2 } from "lucide-react";
import { resumesApi } from "@/lib/api/resumes";
import { getErrorMessage } from "@/lib/api/errors";
import toast from "react-hot-toast";

interface WorkspaceResumeAnalysisProps {
  interview: JobInterview;
  canManage?: boolean;
  onUpdateResume?: (newResume: ResumeReference) => Promise<void> | void;
}

export default function WorkspaceResumeAnalysis({
  interview,
  canManage,
  onUpdateResume,
}: WorkspaceResumeAnalysisProps) {
  const { resume, matchAnalysis } = interview;
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onUpdateResume) return;

    setIsUploading(true);
    try {
      const res = await resumesApi.extract(file);
      if (res.data) {
        await onUpdateResume(res.data);
        toast.success(`Resume updated: ${res.data.name}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to parse and update resume file."));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Candidate Resume Info Banner */}
      <div className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#0C356A]/10 text-[#0C356A] dark:bg-blue-950/50 dark:text-blue-400">
            <FileText className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14.5px] sm:text-base font-bold text-slate-900 dark:text-white">
                {resume.parsedData?.candidateName || resume.name}
              </h3>
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {resume.type === "uploaded" ? "Uploaded File" : "Parsed Text"}
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">
              {resume.parsedData?.currentRole || "Candidate"} &bull;{" "}
              {resume.parsedData?.experienceYears
                ? `~${resume.parsedData.experienceYears} Years Exp`
                : "Experienced Professional"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {matchAnalysis && (
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-500">
                Compatibility Score:
              </span>
              <span className="text-xl font-bold text-[#0C356A] dark:text-blue-400">
                {matchAnalysis.overallScore}%
              </span>
            </div>
          )}

          {canManage && onUpdateResume && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0C356A] dark:text-blue-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-[#0C356A]/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-3.5" />
                    <span>Replace Resume</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Match Breakdown Card */}
      {matchAnalysis ? (
        <ResumeMatchCard matchAnalysis={matchAnalysis} />
      ) : (
        <div className="p-6 sm:p-8 text-center bg-white dark:bg-[#1E1E2D] rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
          <AlertCircle className="size-7 text-amber-500 mx-auto mb-1.5" />
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            No Resume Attached
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            This interview was created without a candidate resume. Simulations use standard role expectations.
          </p>
        </div>
      )}

      {/* Parsed Highlights */}
      {resume.parsedData && (
        <div className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3.5">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Resume Profile Highlights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                Detected Education & Certifications
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11.5px]">
                {resume.parsedData.education?.join(", ") || "Computer Science / Engineering Degree"}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                Notable Projects & Background
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11.5px]">
                {resume.parsedData.projects?.join("; ") || "Enterprise systems and scalable customer features."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
