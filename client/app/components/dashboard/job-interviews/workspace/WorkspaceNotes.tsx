"use client";

import React, { useState } from "react";
import type { JobInterview } from "@/lib/types/jobInterview";
import { StickyNote, Clock } from "lucide-react";
import IconButton from "@/components/common/icon-button";
import DeleteConfirmationModal from "@/components/common/delete-confirmation-modal";

interface WorkspaceNotesProps {
  interview: JobInterview;
  onAddNote: (content: string, roundId?: string) => void;
  onDeleteNote: (noteId: string) => void;
}

export default function WorkspaceNotes({
  interview,
  onAddNote,
  onDeleteNote,
}: WorkspaceNotesProps) {
  const [newNoteContent, setNewNoteContent] = useState("");
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [noteIdToDelete, setNoteIdToDelete] = useState<string | null>(null);

  const handleSaveNote = () => {
    if (!newNoteContent.trim()) return;
    onAddNote(newNoteContent.trim(), selectedRoundId || undefined);
    setNewNoteContent("");
    setSelectedRoundId("");
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header & Add Note Card */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
          <div className="p-2 rounded-lg bg-[#0C356A]/10 text-[#0C356A]">
            <StickyNote className="size-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-[17px] font-bold text-slate-900">
              Interview Prep Notes & STAR Talking Points
            </h3>
            <p className="text-xs text-slate-500">
              Save key stories, questions to ask the interviewer, and technical reminders.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <textarea
            rows={3}
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="e.g. STAR Story: How I fixed a database deadlock issue under high load..."
            className="w-full p-3.5 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A] leading-relaxed"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Associate with round (optional):</span>
              <select
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 cursor-pointer"
              >
                <option value="">General (All Rounds)</option>
                {interview.rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    Round {r.order}: {r.title}
                  </option>
                ))}
              </select>
            </div>

            <IconButton
              type="button"
              action="save"
              label="Save Note"
              size="default"
              onClick={handleSaveNote}
              disabled={!newNoteContent.trim()}
            />
          </div>
        </div>
      </div>

      {/* Existing Notes List */}
      <div className="space-y-3">
        {interview.notes.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs sm:text-sm text-slate-400">
              No prep notes saved yet. Add your first note above to prepare!
            </p>
          </div>
        ) : (
          interview.notes.map((note) => {
            const roundObj = interview.rounds.find((r) => r.id === note.roundId);
            return (
              <div
                key={note.id}
                className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-start justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  {roundObj && (
                    <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#0C356A]/10 text-[#0C356A] border border-[#0C356A]/20">
                      Round {roundObj.order}: {roundObj.title}
                    </span>
                  )}
                  <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                    <Clock className="size-3.5 text-slate-400" />
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
                  onClick={() => setNoteIdToDelete(note.id)}
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                />
              </div>
            );
          })
        )}
      </div>

      {/* Delete Note Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(noteIdToDelete)}
        onClose={() => setNoteIdToDelete(null)}
        onConfirm={() => {
          if (noteIdToDelete) {
            onDeleteNote(noteIdToDelete);
          }
        }}
        title="Delete Prep Note?"
        description="Are you sure you want to permanently delete this preparation note? This action cannot be undone."
      />
    </div>
  );
}
