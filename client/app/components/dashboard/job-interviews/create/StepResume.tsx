"use client";

import React, { useState } from "react";
import type { ResumeReference } from "@/lib/types/jobInterview";
import { FileUp, ArrowRight, CheckCircle2, Upload, Loader2 } from "lucide-react";
import IconButton from "@/components/common/icon-button";
import { resumesApi, RESUME_TEXT_MAX } from "@/lib/api/resumes";
import { getErrorMessage } from "@/lib/api/errors";
import toast from "react-hot-toast";

interface StepResumeProps {
  resumeRef: ResumeReference | null;
  setResumeRef: (ref: ResumeReference | null) => void;
  onNext: () => void;
  onBack: () => void;
  isAnalyzing?: boolean;
}

export default function StepResume({
  resumeRef,
  setResumeRef,
  onNext,
  onBack,
  isAnalyzing = false,
}: StepResumeProps) {
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [pastedText, setPastedText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  // The server parses the file (PDF/DOCX/TXT) and returns extracted text + metadata
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file || isExtracting || isAnalyzing) return;

    setIsExtracting(true);
    try {
      const { data } = await resumesApi.extract(file);
      setResumeRef(data);
      toast.success(`Extracted text from "${data.name}"`);
    } catch (err) {
      console.error("Resume extraction failed:", err);
      toast.error(
        getErrorMessage(err, "Couldn't read that file - try a PDF/DOCX or paste the text instead."),
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePasteSubmit = () => {
    if (isAnalyzing || isExtracting) return;
    if (pastedText.trim().length > 10) {
      setResumeRef({
        name: "Pasted_Resume.txt",
        type: "text",
        content: pastedText.slice(0, RESUME_TEXT_MAX),
      });
      toast.success("Resume text saved successfully");
    }
  };

  const isBusy = isAnalyzing || isExtracting;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-lg bg-[#0C356A]/10 text-[#0C356A] shrink-0">
            <FileUp className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Step 2: Attach Candidate Resume (Recommended)
            </h2>
            <p className="text-xs sm:text-[12.5px] text-slate-500 mt-0.5 leading-relaxed">
              Comparing your resume to the job description enables AI to detect skill gaps, customize question difficulty, and highlight strengths.
            </p>
          </div>
        </div>
      </div>

      {/* Main Upload / Paste Box */}
      <div className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        {/* Toggle between Upload & Paste */}
        <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 pb-2.5 gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => !isBusy && setTab("upload")}
            disabled={isBusy}
            className={`text-xs font-semibold pb-1.5 border-b-2 cursor-pointer transition-all ${
              tab === "upload"
                ? "border-[#0C356A] text-[#0C356A] dark:text-blue-300 dark:border-blue-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Upload Document (PDF / DOCX)
          </button>
          <button
            type="button"
            onClick={() => !isBusy && setTab("paste")}
            disabled={isBusy}
            className={`text-xs font-semibold pb-1.5 border-b-2 cursor-pointer transition-all ${
              tab === "paste"
                ? "border-[#0C356A] text-[#0C356A] dark:text-blue-300 dark:border-blue-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Paste Resume Text
          </button>
        </div>

        {tab === "upload" ? (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-7 text-center hover:border-[#0C356A] dark:hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-900/30">
            <input
              type="file"
              id="resume-file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              disabled={isBusy}
              className="hidden"
            />
            <label
              htmlFor="resume-file"
              className={`block ${isBusy ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
            >
              <div className="w-10 h-10 mx-auto rounded-lg bg-[#0C356A]/10 dark:bg-[#0C356A]/30 text-[#0C356A] dark:text-blue-300 flex items-center justify-center mb-2.5">
                {isExtracting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Upload className="size-5" />
                )}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mb-0.5">
                {isExtracting ? "Extracting text from your resume..." : "Click to browse or drag & drop your resume"}
              </p>
              <p className="text-[11px] text-slate-400">
                Supports PDF, DOCX, TXT up to 10MB
              </p>
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              rows={7}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              disabled={isBusy}
              placeholder="Paste plain text version of your resume or LinkedIn profile..."
              className="w-full p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A] font-mono leading-relaxed"
            />
            <IconButton
              type="button"
              action="save"
              label="Set Pasted Resume"
              size="sm"
              onClick={handlePasteSubmit}
              disabled={pastedText.trim().length < 10 || isBusy}
            />
          </div>
        )}

        {/* Active Selected Resume State */}
        {resumeRef && (
          <div className="p-3.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 truncate">
                  {resumeRef.name}
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                  Ready for AI alignment & gap analysis
                </p>
              </div>
            </div>
            <IconButton
              type="button"
              action="remove"
              label="Remove"
              size="sm"
              variant="ghost"
              disabled={isBusy}
              onClick={() => setResumeRef(null)}
              className="shrink-0"
            />
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-4 border-t border-slate-200">
          <IconButton
            type="button"
            action="back"
            label="Back to Job Description"
            onClick={onBack}
            disabled={isBusy}
            className="w-full sm:w-auto justify-center"
          />

          <IconButton
            type="button"
            onClick={onNext}
            disabled={isBusy}
            isLoading={isAnalyzing}
            loadingText="Analyzing with AI..."
            icon={<ArrowRight className="size-4" />}
            iconPosition="right"
            label={resumeRef ? "Run AI Analysis" : "Skip Resume & Analyze"}
            variant="default"
            className="w-full sm:w-auto justify-center"
          />
        </div>
      </div>
    </div>
  );
}
