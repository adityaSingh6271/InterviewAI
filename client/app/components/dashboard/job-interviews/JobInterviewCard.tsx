import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JobInterview } from "@/lib/types/jobInterview";
import { Building, Layers } from "lucide-react";
import MoreActionsMenu from "@/components/common/more-actions-menu";
import { useStudentApplications } from "@/lib/hooks/useStudentApplications";

interface JobInterviewCardProps {
  interview: JobInterview;
  /** Admin or draft owner: allow edit actions when true. */
  canManage?: boolean;
  /** Admin or interview creator: allow delete actions when true. */
  canDelete?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: () => void;
}

export default function JobInterviewCard({
  interview,
  canManage = false,
  canDelete = false,
  onDelete,
  onEdit,
}: JobInterviewCardProps) {
  const router = useRouter();
  const { getApplication } = useStudentApplications();
  const application = getApplication(interview.id);

  const completedRounds = interview.rounds.filter(
    (r) => r.status === "completed",
  );
  // Prefer server aggregates when present (list rows don't load rounds).
  const totalRounds = interview.totalRounds ?? interview.rounds.length;
  const doneRounds = interview.completedRounds ?? completedRounds.length;

  const getApplicationBadge = () => {
    if (!application) return null;
    switch (application.status) {
      case "APPLIED":
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            Applied
          </span>
        );
      case "SHORTLISTED":
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Shortlisted
          </span>
        );
      case "INTERVIEWED":
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Interviewed
          </span>
        );
      case "REJECTED":
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            Declined
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (interview.status) {
      case "completed":
        return (
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Completed
          </span>
        );
      case "in_progress":
        return (
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            In Progress
          </span>
        );
      case "draft":
        return (
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Draft
          </span>
        );
      case "archived":
        return (
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
            Archived
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#0C356A]/10 text-[#0C356A] border border-[#0C356A]/20">
            Ready
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => router.push(`/dashboard/interviews/${interview.id}`)}
      className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-[#0C356A]/50 hover:shadow-sm transition-all duration-200 flex flex-col justify-between gap-4 group cursor-pointer"
    >
      <div className="space-y-3">
        {/* Top Badges & Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
              {interview.category || "Engineering"}
            </span>
            {interview.experienceLevel && (
              <span className="text-[11px] font-normal text-slate-500">
                · {interview.experienceLevel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {getApplicationBadge()}
            {getStatusBadge()}
            {(canManage || canDelete) && onDelete && (
              <MoreActionsMenu
                onView={() =>
                  router.push(`/dashboard/interviews/${interview.id}`)
                }
                onEdit={canManage ? onEdit : undefined}
                onDelete={() => onDelete(interview.id)}
              />
            )}
          </div>
        </div>

        {/* Title & Company */}
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900 group-hover:text-[#0C356A] transition-colors line-clamp-1 leading-snug">
            {interview.targetRole}
          </h3>
          <p className="text-[11.5px] text-slate-500 flex items-center gap-1.5 mt-0.5 font-normal">
            <Building className="size-3.5 text-slate-400 shrink-0" />
            <span>{interview.company || "Target Company"}</span>
          </p>
        </div>

        {/* Progress & Rounds stats */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11.5px] font-normal text-slate-600">
            <span className="flex items-center gap-1.5">
              <Layers className="size-3.5 text-[#0C356A]" />
              {doneRounds} of {totalRounds} Rounds Done
            </span>
            <span className="font-medium text-slate-900">
              {interview.overallProgress}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#0C356A] rounded-full transition-all duration-500"
              style={{ width: `${interview.overallProgress}%` }}
            />
          </div>
        </div>

        {/* Resume Match pill if present */}
        {interview.matchAnalysis && (
          <div className="flex items-center gap-1.5 pt-0.5 text-[11.5px]">
            <span className="text-slate-500 font-normal">Resume Match:</span>
            <span className="font-medium text-emerald-600">
              {interview.matchAnalysis.overallScore}%
            </span>
          </div>
        )}

        {/* Action Footer Button */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100/80">
          <span className="text-[11px] text-slate-400">
            {doneRounds === totalRounds && totalRounds > 0
              ? "All rounds finished"
              : "Simulation ready"}
          </span>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#0C356A] text-white hover:bg-[#0C356A]/90 transition-colors shadow-2xs"
          >
            {doneRounds === totalRounds && totalRounds > 0
              ? "View Results"
              : "Start Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
