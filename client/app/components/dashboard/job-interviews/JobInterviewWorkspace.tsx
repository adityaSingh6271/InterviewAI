"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import type { JobInterview, InterviewRound } from "@/lib/types/jobInterview";
import { queryKeys } from "@/lib/api/queryKeys";
import WorkspaceOverview from "./workspace/WorkspaceOverview";
import WorkspaceRounds from "./workspace/WorkspaceRounds";
import WorkspaceResumeAnalysis from "./workspace/WorkspaceResumeAnalysis";
import WorkspaceJobDescription from "./workspace/WorkspaceJobDescription";
import AttemptModal from "./AttemptModal";
import EditJobInterviewModal from "./EditJobInterviewModal";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  PlayIcon,
  Award01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Briefcase01Icon,
  FileTextIcon,
  Layers01Icon,
  LayoutDashboardIcon,
  ArrowDown01Icon,
  Note01Icon,
  Building03Icon,
  Timer01Icon,
  JobLinkIcon,
} from "@hugeicons/core-free-icons";
import IconButton from "@/components/common/icon-button";
import DeleteConfirmationModal from "@/components/common/delete-confirmation-modal";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

interface JobInterviewWorkspaceProps {
  interview: JobInterview;
  /** Admin or draft owner: show the Edit action. */
  canManage?: boolean;
  /** Admin or interview creator: show the Delete action. */
  canDelete?: boolean;
  /** PATCH handler (Edit modal); rejects on failure (toast from the hook). */
  onUpdateInterview?: (updates: Partial<JobInterview>) => Promise<void> | void;
  /** DELETE handler for the current interview. */
  onDeleteInterview?: () => Promise<void> | void;
  onAddNote: (content: string, roundId?: string) => void;
  onDeleteNote: (noteId: string) => void;
}

/** Circular SVG progress ring */
function ProgressRing({
  pct,
  size = 80,
  stroke = 7,
  color = "#2563EB",
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#E2E8F0"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

export default function JobInterviewWorkspace({
  interview,
  canManage = false,
  canDelete = false,
  onUpdateInterview,
  onDeleteInterview,
  onAddNote,
  onDeleteNote,
}: JobInterviewWorkspaceProps) {
  const queryClient = useQueryClient();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    jd: false,
    resume: false,
    rounds: false,
    overview: false,
  });

  const [activeAttemptRound, setActiveAttemptRound] = useState<InterviewRound | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [quickNoteContent, setQuickNoteContent] = useState("");
  const [quickNoteRoundId, setQuickNoteRoundId] = useState("");
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const completedRoundsCount = interview.rounds.filter((r) => r.status === "completed").length;
  const nextPendingRound =
    interview.rounds.find((r) => r.status !== "completed") || interview.rounds[0];
  const overallScore = interview.matchAnalysis?.overallScore ?? null;
  const matchLabel = interview.matchAnalysis?.matchLabel ?? null;

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteContent.trim()) return;
    onAddNote(quickNoteContent.trim(), quickNoteRoundId || undefined);
    setQuickNoteContent("");
    setQuickNoteRoundId("");
  };

  // Deduplicate all tech tags across technologies and required skills
  const allUniqueTech = Array.from(
    new Set(
      [
        ...(interview.extractedJobData?.technologies || []),
        ...(interview.extractedJobData?.requiredSkills || []),
      ]
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
  const techTags = allUniqueTech.slice(0, 6);
  const duration = interview.sessionDurationMinutes || 30;

  // Clean raw scraper duplicate headers like "About the Job About the Role:"
  const cleanHeroSummary = interview.jobDescription
    ? interview.jobDescription
        .replace(/^(about the job\s*:?\s*|about the role\s*:?\s*|job overview\s*:?\s*)+/gi, "")
        .trim()
    : "";

  const matchLabelMap: Record<string, { label: string; color: string }> = {
    strong: { label: "Strong Match", color: "bg-emerald-50 text-emerald-600 border border-emerald-100" },
    moderate: { label: "Moderate Match", color: "bg-amber-50 text-amber-700 border border-amber-200" },
    weak: { label: "Needs Work", color: "bg-red-50 text-red-700 border border-red-200" },
  };
  const matchDisplay = (matchLabel && matchLabelMap[matchLabel]) || {
    label: "Pending",
    color: "bg-slate-100 text-slate-600 border border-slate-200",
  };

  const sections = [
    {
      id: "jd",
      num: "01",
      title: "Job Description & Role Specification",
      description: "Understand the role, key responsibilities, required skills and expectations.",
      badge: `${allUniqueTech.length} Tech Stack`,
      badgeColor: "bg-slate-100 text-slate-600",
      content: <WorkspaceJobDescription interview={interview} />,
    },
    {
      id: "resume",
      num: "02",
      title: "Resume Match & AI Diagnostic",
      description:
        "See how well your profile matches the role, identify skill gaps and get improvement suggestions.",
      badge: overallScore != null ? `${overallScore}% Match` : "No Resume Match",
      badgeColor: "bg-emerald-50 text-emerald-600 border border-emerald-100",
      content: (
        <WorkspaceResumeAnalysis
          interview={interview}
          canManage={canManage}
          onUpdateResume={
            onUpdateInterview
              ? async (newResume) => {
                  await onUpdateInterview({ resume: newResume });
                }
              : undefined
          }
        />
      ),
    },
    {
      id: "rounds",
      num: "03",
      title: `Interview Practice Rounds (${interview.rounds.length})`,
      description:
        "Interactive multi-round simulation with questions and AI feedback.",
      badge: `${completedRoundsCount} / ${interview.rounds.length} Completed`,
      badgeColor: "bg-slate-100 text-slate-600",
      content: (
        <WorkspaceRounds
          interview={interview}
          onStartAttempt={(round) => setActiveAttemptRound(round)}
        />
      ),
    },
    {
      id: "overview",
      num: "04",
      title: "Overall Readiness & Diagnostic Telemetry",
      description: "Track your preparation progress and get key insights.",
      badge: `${interview.overallProgress}% Complete`,
      badgeColor: "bg-slate-100 text-slate-600",
      content: (
        <WorkspaceOverview
          interview={interview}
          onStartAttempt={(round) => setActiveAttemptRound(round)}
          onSwitchTab={(id) => setExpandedSections((p) => ({ ...p, [id]: true }))}
        />
      ),
    },
  ];

  return (
    <div className="w-full pb-20 relative">

      {/* ── TOP BACK NAVIGATION + EDIT ACTION ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <Link
          href="/dashboard/interviews"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors group"
        >
          <HugeiconsIcon
            icon={ArrowLeft02Icon}
            size={15}
            className="transition-transform group-hover:-translate-x-0.5 text-slate-500"
          />
          <span>Back to Job Interviews</span>
        </Link>
        {(canManage || (canDelete && onDeleteInterview)) && (
          <div className="flex items-center gap-2">
            {canManage && (
              <IconButton
                type="button"
                action="edit"
                variant="outline"
                label="Edit Interview"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="text-xs bg-white"
              />
            )}
            {canDelete && onDeleteInterview && (
              <IconButton
                type="button"
                action="delete"
                variant="outline"
                label="Delete Interview"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
                className="text-xs bg-white text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              />
            )}
          </div>
        )}
      </div>

      {/* ── HERO HEADER CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 sm:p-6 md:p-8 mb-5">

        {/* Badge tags */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3.5">
          {interview.category && (
            <span className="text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-slate-100 text-slate-700">
              {interview.category}
            </span>
          )}
          {interview.status && (
            <span className="text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
              {interview.status === "ready" ? "Ready" : interview.status.replace("_", " ")}
            </span>
          )}
          {interview.eligibilityStatus === "eligible" && (
            <span className="text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1">
              <span>✓</span> Eligible Candidate
            </span>
          )}
          {interview.eligibilityStatus === "needs_resume_improvement" && (
            <span className="text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Resume Review Suggested
            </span>
          )}
        </div>

        {/* Title + CTA Layout */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">

          {/* Left Details */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-[28px] font-bold text-slate-900 tracking-tight leading-tight">
              {interview.targetRole}
            </h1>

            {cleanHeroSummary && (
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed max-w-2xl line-clamp-2">
                {cleanHeroSummary.slice(0, 160)}
                {cleanHeroSummary.length > 160 ? "..." : ""}
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1.5 sm:gap-y-2 text-xs text-slate-500 mt-3 sm:mt-3.5">
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Building03Icon} size={15} className="text-slate-400" />
                {interview.company || "Stripe"}
              </span>
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Briefcase01Icon} size={15} className="text-slate-400" />
                {interview.extractedJobData?.inferredInterviewType || "Full-time"}
              </span>
              {interview.industry && (
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={JobLinkIcon} size={15} className="text-slate-400" />
                  {interview.industry}
                </span>
              )}
              {interview.experienceLevel && (
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Timer01Icon} size={15} className="text-slate-400" />
                  {interview.experienceLevel}
                </span>
              )}
            </div>

            {/* Tech stack tags */}
            {techTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3.5 sm:mt-4">
                {techTags.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-[11px] sm:text-xs font-medium shadow-2xs hover:border-slate-300 transition-colors cursor-default"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: CTA */}
          <div className="flex flex-col items-stretch sm:items-center w-full lg:w-auto shrink-0 self-stretch sm:self-start lg:self-center pt-2 sm:pt-0">
            {nextPendingRound ? (
              <button
                type="button"
                onClick={() => setActiveAttemptRound(nextPendingRound)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0C356A] hover:bg-[#092850] text-white text-[14px] font-semibold shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <HugeiconsIcon icon={PlayIcon} size={16} />
                <span>{completedRoundsCount > 0 ? "Continue Practice" : "Start Practice"}</span>
              </button>
            ) : (
              <span className="w-full sm:w-auto text-center px-6 py-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200">
                ✓ All Rounds Complete
              </span>
            )}
            <p className="text-[11px] sm:text-[11.5px] text-slate-400 text-center font-normal mt-2">
              {duration} mins per mock interview
            </p>
          </div>
        </div>
      </div>

      {/* ── METRICS / STATS CARD (Single unified card with responsive grid) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 sm:p-6 mb-5 sm:mb-6 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">

        {/* Metric 1: Resume Match */}
        <div className="flex items-center gap-4 pb-4 md:pb-0 md:px-4 first:md:pl-0">
          <div className="relative flex items-center justify-center shrink-0">
            <ProgressRing pct={overallScore ?? 0} size={64} stroke={6} color="#2563EB" />
            <span className="absolute text-sm sm:text-base font-bold text-slate-900">
              {overallScore != null ? `${overallScore}%` : "—"}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-slate-900">Resume Match</span>
              <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full ${matchDisplay.color}`}>
                {matchDisplay.label}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-snug">
              {overallScore != null
                ? interview.matchAnalysis?.experienceAlignment?.summary ||
                  "Computed from resume-to-JD skill alignment."
                : "Upload a resume or run analysis to compute role match."}
            </p>
          </div>
        </div>

        {/* Metric 2: Interview Rounds */}
        <div className="flex items-center gap-4 py-4 md:py-0 md:px-5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={Layers01Icon} size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
              {completedRoundsCount} / {interview.rounds.length}
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-1">
              Interview Rounds
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-snug">
              Complete all rounds to be fully prepared
            </p>
          </div>
        </div>

        {/* Metric 3: Session Duration */}
        <div className="flex items-center gap-4 pt-4 md:pt-0 md:px-5 last:md:pr-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={Clock01Icon} size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
              {duration} mins
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-1">
              Session Duration
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-snug">
              Per mock interview
            </p>
          </div>
        </div>
      </div>

      {/* ── YOUR INTERVIEW PREPARATION (Responsive rounded cards) ── */}
      <div className="space-y-3.5 sm:space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Your Interview Preparation</h2>
          <p className="text-[11.5px] sm:text-xs text-slate-500 mt-0.5">
            Review key details and complete the steps below before starting your practice.
          </p>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {sections.map((section) => (
            <div
              key={section.id}
              id={`section-${section.id}`}
              className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-150 hover:border-slate-300"
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full px-3.5 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-2.5 sm:gap-4 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <span className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-200 bg-slate-50/50 text-slate-500 text-[11px] sm:text-xs font-semibold flex items-center justify-center">
                    {section.num}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                      {section.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 truncate">
                      {section.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className={`text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${section.badgeColor}`}>
                    {section.badge}
                  </span>
                  <div
                    className={`text-slate-400 transition-transform duration-200 ${
                      expandedSections[section.id] ? "rotate-180" : "rotate-0"
                    }`}
                  >
                    <HugeiconsIcon icon={ArrowDown01Icon} size={15} />
                  </div>
                </div>
              </button>

              {expandedSections[section.id] && (
                <div className="px-3 sm:px-6 pb-4 sm:pb-6 pt-2 border-t border-slate-100 bg-white animate-in fade-in duration-200">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Shadcn Sheet: Quick Prep Notes ── */}
      <Sheet open={isNotesDrawerOpen} onOpenChange={setIsNotesDrawerOpen}>
        <SheetTrigger asChild>
          <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center">
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-3 bg-[#0C356A] hover:bg-[#092850] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border border-white/20 scale-100 hover:scale-105"
              title="Toggle Quick Prep Notes"
            >
              <div className="p-1 rounded-full bg-amber-400 text-slate-900 shrink-0">
                <HugeiconsIcon icon={Note01Icon} size={14} className="stroke-[2.2]" />
              </div>
              <span className="text-xs font-bold whitespace-nowrap">Prep Notes</span>
              <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-white/20 text-blue-100">
                {interview.notes.length}
              </span>
            </button>
          </div>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="sm:max-w-xl md:max-w-2xl w-full p-0 flex flex-col gap-0 overflow-hidden bg-white dark:bg-[#1E1E2D] border-l border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          <SheetHeader className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                <HugeiconsIcon icon={Note01Icon} size={18} />
              </div>
              <div>
                <SheetTitle className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Quick Prep Notes
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    {interview.notes.length}
                  </span>
                </SheetTitle>
                <SheetDescription className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Talking points & STAR stories for {interview.targetRole}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <form
            onSubmit={handleSaveQuickNote}
            className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-white dark:bg-[#1E1E2D]"
          >
            <textarea
              rows={3}
              maxLength={500}
              value={quickNoteContent}
              onChange={(e) => setQuickNoteContent(e.target.value)}
              placeholder="Jot down a quick note, STAR story, or question..."
              className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Personal notes & STAR references</span>
              <span>{quickNoteContent.length}/500</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <select
                value={quickNoteRoundId}
                onChange={(e) => setQuickNoteRoundId(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer flex-1 max-w-50"
              >
                <option value="">General (All Rounds)</option>
                {interview.rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    Round {r.order}: {r.title}
                  </option>
                ))}
              </select>
              <IconButton
                type="submit"
                action="save"
                label="Add Note"
                size="sm"
                disabled={!quickNoteContent.trim()}
                className="shadow-2xs text-xs"
              />
            </div>
          </form>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
            {interview.notes.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <HugeiconsIcon
                  icon={Note01Icon}
                  size={32}
                  className="text-slate-300 dark:text-slate-600 mx-auto"
                />
                <p>No notes added yet.</p>
                <p className="text-[11px] text-slate-400">
                  Add notes above while reviewing JD or rounds!
                </p>
              </div>
            ) : (
              interview.notes.map((note) => {
                const roundObj = interview.rounds.find((r) => r.id === note.roundId);
                return (
                  <div
                    key={note.id}
                    className="pt-3 first:pt-0 flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1 flex-1">
                      {roundObj && (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          Round {roundObj.order}: {roundObj.title}
                        </span>
                      )}
                      <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                      <span className="text-[10.5px] text-slate-400 flex items-center gap-1 font-medium">
                        <HugeiconsIcon icon={Clock01Icon} size={12} className="text-slate-400" />
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <IconButton
                      type="button"
                      action="delete"
                      variant="ghost"
                      showLabel={false}
                      size="icon-sm"
                      tooltip="Delete note"
                      onClick={() => setNoteToDelete(note.id)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    />
                  </div>
                );
              })
            )}
          </div>

          <SheetFooter className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-center text-[11px] text-slate-500 dark:text-slate-400">
            Prep notes are auto-saved and linked to this interview workspace.
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Note Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(noteToDelete)}
        onClose={() => setNoteToDelete(null)}
        onConfirm={() => {
          if (noteToDelete) {
            onDeleteNote(noteToDelete);
            setNoteToDelete(null);
          }
        }}
        title="Delete Note?"
        description="Are you sure you want to delete this prep note? This action cannot be undone."
      />

      {/* Delete Interview Modal */}
      {canDelete && onDeleteInterview && (
        <DeleteConfirmationModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={async () => {
            await onDeleteInterview();
          }}
          title="Delete Job Interview?"
          itemName={`${interview.targetRole}${interview.company ? ` @ ${interview.company}` : ""}`}
          description="All tailored rounds, prep notes, and simulation attempt records for this interview will be permanently removed."
        />
      )}

      {/* Edit Interview Modal (admin) */}
      {isEditOpen && onUpdateInterview && (
        <EditJobInterviewModal
          interview={interview}
          onClose={() => setIsEditOpen(false)}
          onUpdate={onUpdateInterview}
        />
      )}

      {/* Live Simulation Modal */}
      {activeAttemptRound && (
        <AttemptModal
          interview={interview}
          round={activeAttemptRound}
          onClose={() => setActiveAttemptRound(null)}
          onSubmitted={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.attempts.all });
          }}
        />
      )}
    </div>
  );
}
