"use client";

import React, { useState, useRef, useEffect } from "react";
import { MoreVertical, Eye, Trash2, Pencil } from "lucide-react";

interface MoreActionsMenuProps {
  onView: () => void;
  onDelete: () => void;
  /** Optional edit action - rendered between view and delete when present. */
  onEdit?: () => void;
  viewLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  align?: "left" | "right";
  className?: string;
}

export default function MoreActionsMenu({
  onView,
  onDelete,
  onEdit,
  viewLabel = "Open Workspace",
  editLabel = "Edit Interview",
  deleteLabel = "Delete Interview",
  align = "right",
  className = "",
}: MoreActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={menuRef}
      className={`relative inline-block text-left ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="More actions"
        title="More actions"
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <MoreVertical className="w-4 h-4 shrink-0" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-1 w-44 rounded-xl bg-white border border-slate-200 py-1 shadow-lg z-30 animate-in fade-in zoom-in-95 duration-100`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onView();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0C356A] transition-colors text-left cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0C356A] shrink-0" />
            <span>{viewLabel}</span>
          </button>

          {onEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onEdit();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0C356A] transition-colors text-left cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{editLabel}</span>
            </button>
          )}

          <div className="h-px bg-slate-100 my-0.5" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-medium text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>{deleteLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}
