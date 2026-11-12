"use client";

import React, { useState } from "react";
import type { JobInterview } from "@/lib/types/jobInterview";
import { ChevronDown, ChevronUp } from "lucide-react";

interface WorkspaceJobDescriptionProps {
  interview: JobInterview;
}

export default function WorkspaceJobDescription({
  interview,
}: WorkspaceJobDescriptionProps) {
  const { extractedJobData, jobDescription } = interview;
  const [showFullJD, setShowFullJD] = useState(false);

  // Deduplicate all required competencies & technologies so none repeat
  const uniqueSkills = Array.from(
    new Set(
      [
        ...(extractedJobData.requiredSkills || []),
        ...(extractedJobData.technologies || []),
      ]
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );

  // Clean raw scraper duplicate headers like "About the Job About the Role:"
  const cleanDescription = (jobDescription || "")
    .replace(/^(about the job\s*:?\s*|about the role\s*:?\s*|job overview\s*:?\s*)+/gi, "")
    .trim();

  return (
    <div className="space-y-4 pt-1">
      {/* Target Competencies & Tech Stack */}
      {uniqueSkills.length > 0 && (
        <div className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Target Competencies & Tech Stack
            </h4>
            <span className="text-[11px] font-semibold text-slate-400">
              {uniqueSkills.length} Verified Skills
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {uniqueSkills.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 rounded-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Role Summary & Job Description */}
      {cleanDescription && (
        <div className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Role Requirements & Responsibilities
            </h4>
            <button
              type="button"
              onClick={() => setShowFullJD((prev) => !prev)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{showFullJD ? "Collapse Description" : "Expand Full Description"}</span>
              {showFullJD ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          </div>

          <div
            className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line ${
              showFullJD ? "" : "line-clamp-6"
            }`}
          >
            {cleanDescription}
          </div>
        </div>
      )}
    </div>
  );
}
