"use client";

import React from "react";
import type { ExtractedJobData } from "@/lib/types/jobInterview";
import { Sparkles } from "lucide-react";

interface ExtractedJobInfoProps {
  extractedData: ExtractedJobData;
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
}

export default function ExtractedJobInfo({
  extractedData,
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
}: ExtractedJobInfoProps) {
  return (
    <div className="bg-white dark:bg-[#1E1E2D] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-[#0C356A]/10 text-[#0C356A] dark:bg-blue-950/50 dark:text-blue-400 shrink-0">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14.5px] sm:text-base font-bold text-slate-900 dark:text-white">
              AI-Extracted Job Parameters
            </h3>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
              Confidence:{" "}
              <span className="capitalize font-semibold text-emerald-600 dark:text-emerald-400">
                {extractedData.extractionConfidence}
              </span>{" "}
              — You can fine-tune any field below.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Role Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Role Title *
          </label>
          <input
            type="text"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
            className="w-full px-3 py-2 bg-slate-50/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs sm:text-[13px] font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A]"
          />
        </div>

        {/* Company */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Company Name
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Stripe, OpenAI, Linear"
            className="w-full px-3 py-2 bg-slate-50/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs sm:text-[13px] font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A]"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Job Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs sm:text-[13px] font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A] cursor-pointer"
          >
            <option value="Engineering">Engineering & Software</option>
            <option value="AI / Machine Learning">AI & Machine Learning</option>
            <option value="Product Management">Product Management</option>
            <option value="Design & UX">Design & UX</option>
            <option value="Data & Analytics">Data & Analytics</option>
            <option value="General">General / Business</option>
          </select>
        </div>

        {/* Experience Level */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Target Seniority Level
          </label>
          <select
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs sm:text-[13px] font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A] cursor-pointer"
          >
            <option value="Intern / Junior">Entry / Junior (0-2 yrs)</option>
            <option value="Mid-Level">Mid-Level (2-5 yrs)</option>
            <option value="Senior">Senior (5-8 yrs)</option>
            <option value="Lead / Staff">Lead / Staff (8+ yrs)</option>
            <option value="Principal / Director">Principal / Director</option>
          </select>
        </div>
      </div>

      {/* Target Skills & Technologies */}
      <div className="pt-1.5">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Detected Key Skills & Stack
        </label>
        <div className="flex flex-wrap gap-1.5">
          {extractedData.requiredSkills.concat(extractedData.technologies || []).slice(0, 10).map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
