"use client";

import React, { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import IconButton from "./icon-button";

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: React.ReactNode;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Item",
  description,
  itemName,
  confirmText = "Delete",
  cancelText = "Cancel",
  isLoading = false,
}: DeleteConfirmationModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading && !internalLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, internalLoading, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
      onClose();
    }
  };

  const isBusy = isLoading || internalLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={isBusy ? undefined : onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 z-10 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="absolute top-4.5 right-4.5 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Warning Icon & Heading */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <Trash2 className="w-6 h-6 stroke-[2.2]" />
          </div>

          <div className="space-y-1 pr-6">
            <h3 className="text-[17px] sm:text-[18px] font-bold text-slate-900 leading-tight">
              {title}
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed">
              {description ? (
                description
              ) : itemName ? (
                <>
                  Are you sure you want to permanently delete{" "}
                  <span className="font-bold text-slate-800">&ldquo;{itemName}&rdquo;</span>? This action cannot be undone.
                </>
              ) : (
                "Are you sure you want to delete this? This action cannot be undone."
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <IconButton
            type="button"
            action="cancel"
            label={cancelText}
            variant="outline"
            onClick={onClose}
            disabled={isBusy}
          />
          <IconButton
            type="button"
            action="delete"
            label={confirmText}
            variant="destructive"
            onClick={handleConfirm}
            isLoading={isBusy}
            loadingText="Deleting..."
          />
        </div>
      </div>
    </div>
  );
}
