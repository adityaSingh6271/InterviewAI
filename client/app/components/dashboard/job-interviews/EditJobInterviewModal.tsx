import React, { useState, useRef } from "react";
import type { JobInterview, JobInterviewStatus, ResumeReference } from "@/lib/types/jobInterview";
import { PencilEdit02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import IconButton from "@/components/common/icon-button";
import { resumesApi } from "@/lib/api/resumes";
import { getErrorMessage } from "@/lib/api/errors";
import toast from "react-hot-toast";
import { FileText, UploadCloud, CheckCircle2, Loader2 } from "lucide-react";

interface EditJobInterviewModalProps {
  interview: JobInterview;
  onClose: () => void;
  /** PATCH handler from the hook - rejects on failure (toast shown there). */
  onUpdate: (updates: Partial<JobInterview>) => Promise<void> | void;
}

/** Editable status values (client vocabulary). */
const STATUS_OPTIONS: { value: JobInterviewStatus; label: string }[] = [
  { value: "draft", label: "Draft (hidden from students)" },
  { value: "ready", label: "Ready (published)" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

/**
 * Edit dialog: title, publication status, description, and attached candidate resume.
 */
export default function EditJobInterviewModal({
  interview,
  onClose,
  onUpdate,
}: EditJobInterviewModalProps) {
  const [title, setTitle] = useState(interview.title);
  const [status, setStatus] = useState<JobInterviewStatus>(interview.status);
  const [description, setDescription] = useState(interview.jobDescription);
  const [newResume, setNewResume] = useState<ResumeReference | null>(null);
  const [isExtractingResume, setIsExtractingResume] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsExtractingResume(true);
    setError(null);
    try {
      const res = await resumesApi.extract(file);
      if (res.data) {
        setNewResume(res.data);
        toast.success(`Extracted resume: ${res.data.name}`);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to parse resume file - try PDF, DOCX, or TXT."));
    } finally {
      setIsExtractingResume(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onUpdate({
        title: trimmed,
        status,
        jobDescription: description,
        ...(newResume ? { resume: newResume } : {}),
      });
      onClose();
    } catch {
      // Failure toast was already emitted by the hook.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm sm:text-base">
            <HugeiconsIcon
              icon={PencilEdit02Icon}
              className="w-4 h-4 text-[#0C356A] shrink-0"
              strokeWidth={2}
            />
            <span>Edit Job Interview</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label
              htmlFor="edit-title"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Title
            </label>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A]"
              placeholder="Role @ Company"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="edit-status"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Status
            </label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as JobInterviewStatus)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A] cursor-pointer"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="edit-description"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Description
            </label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={4000}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A] resize-y"
              placeholder="Role overview shown in the workspace..."
            />
            <p className="text-[10.5px] text-slate-400 text-right">
              {description.length}/4000
            </p>
          </div>

          {/* Resume Upload / Replace */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Candidate Resume Attachment
              </label>
              {newResume && (
                <button
                  type="button"
                  onClick={() => setNewResume(null)}
                  className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                >
                  Reset to original
                </button>
              )}
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-[#0C356A] shrink-0">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {newResume ? newResume.name : (interview.resume?.name || "Standard Profile")}
                    </span>
                    {newResume ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-700 flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="size-2.5" />
                        New File Staged
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-600 shrink-0">
                        Current File
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {newResume
                      ? `Extracted ${(newResume.content?.length || 0).toLocaleString()} characters`
                      : (interview.resume?.parsedData?.candidateName || "Uploaded or parsed resume")}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleResumeFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isExtractingResume}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0C356A] bg-white border border-slate-200 hover:bg-[#F1F6FD] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isExtractingResume ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Parsing File...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="size-3.5" />
                      <span>{newResume || interview.resume ? "Replace Resume" : "Upload Resume"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="text-[10.5px] text-slate-400">
              Supported formats: PDF, DOCX, TXT (up to 10MB). Text and metadata will be parsed automatically.
            </p>
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <IconButton
              type="button"
              action="cancel"
              label="Cancel"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
              className="text-xs"
            />
            <IconButton
              type="submit"
              action="save"
              label="Save Changes"
              isLoading={saving}
              loadingText="Saving..."
              disabled={saving}
              className="text-xs"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
