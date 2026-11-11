import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JobInterview } from "@/lib/types/jobInterview";
import JobInterviewCard from "./JobInterviewCard";
import JobInterviewSearchBar from "./JobInterviewSearchBar";
import EditJobInterviewModal from "./EditJobInterviewModal";
import {
  Briefcase,

  Building,
  Table as TableIcon,
  LayoutGrid,
  Search,
  ChevronsUpDown,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import IconButton from "@/components/common/icon-button";
import DeleteConfirmationModal from "@/components/common/delete-confirmation-modal";

interface JobInterviewsManagerProps {
  interviews: JobInterview[];
  filteredInterviews: JobInterview[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  onDeleteInterview: (id: string) => Promise<void> | void;
  /** Admin sessions only: show edit/delete affordances across all rows. */
  canManage: boolean;
  /** Optional per-row edit permission (defaults to `canManage`). */
  canEditItem?: (item: JobInterview) => boolean;
  /** Optional per-row delete permission (defaults to `canManage`). */
  canDeleteItem?: (item: JobInterview) => boolean;
  /** Both portals: show the create affordance (server pins students' scope). */
  canCreate: boolean;
  /** PATCH from the edit modal (rejects on failure; toast from the hook). */
  onUpdateInterview: (id: string, updates: Partial<JobInterview>) => Promise<void>;
  /** Server-side pagination over the full result set. */
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  total: number;
}

export default function JobInterviewsManager({
  interviews,
  filteredInterviews,
  loading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  onDeleteInterview,
  canManage,
  canEditItem,
  canDeleteItem,
  canCreate,
  onUpdateInterview,
  page,
  setPage,
  totalPages,
  total,
}: JobInterviewsManagerProps) {
  const router = useRouter();
  // Default to list (table) view as requested
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [interviewToDelete, setInterviewToDelete] =
    useState<JobInterview | null>(null);
  const [interviewToEdit, setInterviewToEdit] = useState<JobInterview | null>(
    null,
  );

  const canEdit = (item: JobInterview) =>
    canEditItem ? canEditItem(item) : canManage;
  const canDelete = (item: JobInterview) =>
    canDeleteItem ? canDeleteItem(item) : canManage;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Completed
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            In Progress
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Draft
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#0C356A]/10 text-[#0C356A] border border-[#0C356A]/20">
            Ready
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-semibold text-slate-900 flex items-center gap-2.5 tracking-tight">
            Job Interviews
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
              {total}
            </span>
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 font-normal mt-0.5">
            Targeted interview workspaces generated from job postings and candidate profiles.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === "list"
                  ? "bg-white text-[#0C356A] shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Table / List View"
            >
              <TableIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === "grid"
                  ? "bg-white text-[#0C356A] shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>

          {canCreate && (
            <Link href="/dashboard/interviews/new">
              <IconButton
                type="button"
                action="create"
                label="Create Job Interview"
                className="shadow-2xs whitespace-nowrap"
              />
            </Link>
          )}
        </div>
      </div>

      {/* Interviews Content: Unified Card containing Filter Toolbar + Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] space-y-3 bg-white rounded-2xl border border-slate-200 p-12">
          <div className="w-8 h-8 rounded-full border-2 border-[#0C356A] border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500">Loading job interviews...</p>
        </div>
      ) : filteredInterviews.length === 0 &&
        !searchTerm &&
        statusFilter === "all" &&
        categoryFilter === "all" ? (
        <div className="bg-white p-10 sm:p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#0C356A]/10 text-[#0C356A] flex items-center justify-center">
            <Briefcase className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              No job interviews created yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Create your first job interview by pasting a job description to
              get a tailored simulation workspace.
            </p>
          </div>
        </div>
      ) : viewMode === "list" ? (
        /* Unified ERP Panel: Filters + Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          {/* Filter Toolbar with Rounded Floating-Label Search Pills */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Total Count Badge */}
            <div className="flex items-center justify-center min-w-12 sm:min-w-13.5 h-9 sm:h-10 px-3 sm:px-3.5 bg-[#0C356A] text-white text-xs sm:text-sm font-bold rounded-xl shadow-2xs shrink-0">
              {categoryFilter === "all" ? total : filteredInterviews.length}
            </div>

            {/* Role / Position Search Pill */}
            <div className="relative w-full min-[480px]:w-auto min-[480px]:flex-1 border border-slate-200 rounded-xl px-3.5 py-1.5 focus-within:border-[#0C356A] focus-within:ring-2 focus-within:ring-[#0C356A]/15 transition-all bg-white">
              <span className="absolute -top-2 left-3 px-1 bg-white text-[9.5px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                Role / Title
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                <Search className="size-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Role or Tech Stack..."
                  className="w-full text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Category Select Pill */}
            <div className="relative w-full sm:w-56 border border-slate-200 rounded-xl px-3.5 py-1.5 focus-within:border-[#0C356A] focus-within:ring-2 focus-within:ring-[#0C356A]/15 transition-all bg-white">
              <span className="absolute -top-2 left-3 px-1 bg-white text-[9.5px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                Category
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                <Search className="size-3.5 text-slate-400 shrink-0" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full text-xs sm:text-[13px] font-semibold text-slate-800 focus:outline-none bg-transparent cursor-pointer"
                >
                  <option value="all">Search Category...</option>
                  <option value="Engineering">Engineering</option>
                  <option value="AI / Machine Learning">
                    AI / Machine Learning
                  </option>
                  <option value="Product Management">Product Management</option>
                  <option value="Design & UX">Design & UX</option>
                  <option value="Data & Analytics">Data & Analytics</option>
                </select>
              </div>
            </div>

            {/* Status Select Pill */}
            <div className="relative w-full sm:w-48 border border-slate-200 rounded-xl px-3.5 py-1.5 focus-within:border-[#0C356A] focus-within:ring-2 focus-within:ring-[#0C356A]/15 transition-all bg-white">
              <span className="absolute -top-2 left-3 px-1 bg-white text-[9.5px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                Status
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                <Search className="size-3.5 text-slate-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs sm:text-[13px] font-semibold text-slate-800 focus:outline-none bg-transparent cursor-pointer"
                >
                  <option value="all">Search Status...</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Ready</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table / Cards */}
          {filteredInterviews.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs sm:text-sm">
              No matching interviews found for your search criteria.
            </div>
          ) : (
            <>
              {/* Mobile Card List (under md) */}
              <div className="block md:hidden space-y-3">
                {filteredInterviews.map((item) => {
                  const completedRounds = item.rounds.filter(
                    (r) => r.status === "completed",
                  );
                  const totalRounds = item.totalRounds ?? item.rounds.length;
                  const doneRounds =
                    item.completedRounds ?? completedRounds.length;

                  return (
                    <div
                      key={item.id}
                      onClick={() =>
                        router.push(`/dashboard/interviews/${item.id}`)
                      }
                      className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-[#0C356A]/40 transition-all cursor-pointer space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[13.5px] font-semibold text-slate-900 leading-snug">
                            {item.targetRole}
                          </h4>
                          <div className="text-[11px] text-slate-500 font-normal flex items-center gap-1.5 mt-0.5">
                            <Building className="size-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.company || "Target Company"}</span>
                            <span>·</span>
                            <span className="truncate">{item.category || "Engineering"}</span>
                          </div>
                        </div>
                        <div className="shrink-0">{getStatusBadge(item.status)}</div>
                      </div>

                      {/* Progress & Rounds stats */}
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span>Progress ({doneRounds}/{totalRounds} rounds)</span>
                          <span className="font-semibold text-slate-900">{item.overallProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-[#0C356A] rounded-full transition-all duration-500"
                            style={{ width: `${item.overallProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        {item.matchAnalysis ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500">Match:</span>
                            <span className="text-[11px] font-semibold text-emerald-600">
                              {item.matchAnalysis.overallScore}%
                            </span>
                            <span className="text-[10.5px] text-slate-400 capitalize">
                              ({item.matchAnalysis.matchLabel})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Ready to simulate</span>
                        )}

                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconButton
                            type="button"
                            action="view"
                            variant="ghost"
                            showLabel={false}
                            size="icon-sm"
                            tooltip="Open Workspace"
                            onClick={() =>
                              router.push(`/dashboard/interviews/${item.id}`)
                            }
                            className="text-slate-500 hover:text-[#0C356A]"
                          />
                          {canEdit(item) && (
                            <IconButton
                              type="button"
                              action="edit"
                              variant="ghost"
                              showLabel={false}
                              size="icon-sm"
                              tooltip="Edit interview"
                              onClick={() => setInterviewToEdit(item)}
                              className="text-slate-400 hover:text-[#0C356A]"
                            />
                          )}
                          {canDelete(item) && (
                            <IconButton
                              type="button"
                              action="delete"
                              variant="ghost"
                              showLabel={false}
                              size="icon-sm"
                              tooltip="Delete interview"
                              onClick={() => setInterviewToDelete(item)}
                              className="text-slate-400 hover:text-red-600"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (md and up) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm min-w-160">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11.5px] font-semibold text-slate-600">
                      <th className="py-3 px-4 w-20 text-left font-semibold">
                        Action
                      </th>
                      <th className="py-3 px-4 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          Position & Company{" "}
                          <ChevronsUpDown className="size-3 text-slate-400" />
                        </span>
                      </th>
                      <th className="py-3 px-4 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          Category & Level{" "}
                          <ChevronsUpDown className="size-3 text-slate-400" />
                        </span>
                      </th>
                      <th className="py-3 px-4 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          Resume Match{" "}
                          <ChevronsUpDown className="size-3 text-slate-400" />
                        </span>
                      </th>
                      <th className="py-3 px-4 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          Progress{" "}
                          <ChevronsUpDown className="size-3 text-slate-400" />
                        </span>
                      </th>
                      <th className="py-3 px-4 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          Status{" "}
                          <ChevronsUpDown className="size-3 text-slate-400" />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInterviews.map((item) => {
                      const completedRounds = item.rounds.filter(
                        (r) => r.status === "completed",
                      );
                      // List rows carry server aggregates; fall back to the
                      // loaded rounds for plain view-models.
                      const totalRounds = item.totalRounds ?? item.rounds.length;
                      const doneRounds =
                        item.completedRounds ?? completedRounds.length;

                      return (
                        <tr
                          key={item.id}
                          onClick={() =>
                            router.push(`/dashboard/interviews/${item.id}`)
                          }
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          {/* Action column with View / Edit / Delete icons */}
                          <td className="py-3.5 px-4 text-left">
                            <div
                              className="flex items-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconButton
                                type="button"
                                action="view"
                                variant="ghost"
                                showLabel={false}
                                size="icon-sm"
                                tooltip="Open Workspace"
                                onClick={() =>
                                  router.push(`/dashboard/interviews/${item.id}`)
                                }
                                className="text-slate-500 hover:text-[#0C356A] hover:bg-slate-100"
                              />
                              {canEdit(item) && (
                                <IconButton
                                  type="button"
                                  action="edit"
                                  variant="ghost"
                                  showLabel={false}
                                  size="icon-sm"
                                  tooltip="Edit interview"
                                  onClick={() => setInterviewToEdit(item)}
                                  className="text-slate-400 hover:text-[#0C356A] hover:bg-slate-100"
                                />
                              )}
                              {canDelete(item) && (
                                <IconButton
                                  type="button"
                                  action="delete"
                                  variant="ghost"
                                  showLabel={false}
                                  size="icon-sm"
                                  tooltip="Delete interview"
                                  onClick={() => setInterviewToDelete(item)}
                                  className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                />
                              )}
                            </div>
                          </td>

                          {/* Position & Company */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-900 text-[13px] leading-tight group-hover:text-[#0C356A] transition-colors">
                              {item.targetRole}
                            </div>
                            <div className="text-[11.5px] text-slate-500 font-normal flex items-center gap-1.5 mt-0.5">
                              <Building className="size-3 text-slate-400" />
                              <span>{item.company || "Target Company"}</span>
                            </div>
                          </td>

                          {/* Category & Level (Neutral Metadata) */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[12.5px] font-normal text-slate-800">
                                {item.category || "Engineering"}
                              </span>
                              <span className="text-[11px] text-slate-400 font-normal">
                                {item.experienceLevel || "Mid-Level"}
                              </span>
                            </div>
                          </td>

                          {/* Resume Match */}
                          <td className="py-3.5 px-4">
                            {item.matchAnalysis ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[12.5px] font-medium text-emerald-600">
                                  {item.matchAnalysis.overallScore}%
                                </span>
                                <span className="text-[11px] text-slate-400 font-normal capitalize">
                                  ({item.matchAnalysis.matchLabel})
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-normal">—</span>
                            )}
                          </td>

                          {/* Progress */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2 max-w-36">
                              <span className="text-[12.5px] font-medium text-slate-900 shrink-0 min-w-8.5">
                                {item.overallProgress}%
                              </span>
                              <div className="w-18 sm:w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                <div
                                  className="h-full bg-[#0C356A] rounded-full transition-all duration-500"
                                  style={{ width: `${item.overallProgress}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-slate-400 font-normal shrink-0">
                                ({doneRounds}/{totalRounds})
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {getStatusBadge(item.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Server-side pagination (hidden while a single page suffices) */}
          {filteredInterviews.length > 0 && totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages} &middot; {total} interviews
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#0C356A] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronLeft className="size-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#0C356A] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Next
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="space-y-6">
          <JobInterviewSearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            totalCount={categoryFilter === "all" ? total : filteredInterviews.length}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredInterviews.map((item) => {
              const rowCanEdit = canEdit(item);
              const rowCanDelete = canDelete(item);
              return (
                <JobInterviewCard
                  key={item.id}
                  interview={item}
                  canManage={rowCanEdit}
                  canDelete={rowCanDelete}
                  onDelete={
                    rowCanDelete ? () => setInterviewToDelete(item) : undefined
                  }
                  onEdit={rowCanEdit ? () => setInterviewToEdit(item) : undefined}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Interview Modal */}
      {interviewToEdit && (
        <EditJobInterviewModal
          interview={interviewToEdit}
          onClose={() => setInterviewToEdit(null)}
          onUpdate={(updates) => onUpdateInterview(interviewToEdit.id, updates)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(interviewToDelete)}
        onClose={() => setInterviewToDelete(null)}
        onConfirm={async () => {
          if (interviewToDelete) {
            await onDeleteInterview(interviewToDelete.id);
          }
        }}
        title="Delete Job Interview?"
        itemName={
          interviewToDelete
            ? `${interviewToDelete.targetRole}${interviewToDelete.company ? ` @ ${interviewToDelete.company}` : ""}`
            : undefined
        }
        description={
          interviewToDelete ? (
            <>
              Are you sure you want to delete the job interview workspace for{" "}
              <span className="font-bold text-slate-900">
                {interviewToDelete.targetRole}
                {interviewToDelete.company
                  ? ` (${interviewToDelete.company})`
                  : ""}
              </span>
              ? All tailored rounds, prep notes, and simulation attempt records
              will be permanently removed.
            </>
          ) : undefined
        }
      />
    </div>
  );
}
