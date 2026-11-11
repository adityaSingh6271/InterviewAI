"use client";

import React from "react";
import { Search, Filter } from "lucide-react";

interface JobInterviewSearchBarProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  totalCount?: number;
}

export default function JobInterviewSearchBar({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  totalCount,
}: JobInterviewSearchBarProps) {
  const categories = [
    "All",
    "Engineering",
    "AI / Machine Learning",
    "Product Management",
    "Design & UX",
    "Data & Analytics",
  ];

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
      {/* Total Count Badge */}
      {typeof totalCount === "number" && (
        <div className="flex items-center justify-center min-w-12 h-9 px-3 bg-[#0C356A] text-white text-xs font-semibold rounded-lg shadow-2xs shrink-0">
          {totalCount}
        </div>
      )}

      {/* Search Input Pill */}
      <div className="relative w-full min-[480px]:w-auto min-[480px]:flex-1 border border-slate-200 rounded-xl px-3.5 py-1.5 focus-within:border-[#0C356A] focus-within:ring-2 focus-within:ring-[#0C356A]/15 transition-all bg-white">
        <span className="absolute -top-2 left-3 px-1 bg-white text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
          Role / Title
        </span>
        <div className="flex items-center gap-2 pt-0.5">
          <Search className="size-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Role or Tech Stack..."
            className="w-full text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent font-normal"
          />
        </div>
      </div>

      {/* Category Select Pill */}
      <div className="relative w-full sm:w-56 border border-slate-200 rounded-xl px-3.5 py-1.5 focus-within:border-[#0C356A] focus-within:ring-2 focus-within:ring-[#0C356A]/15 transition-all bg-white">
        <span className="absolute -top-2 left-3 px-1 bg-white text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
          Category
        </span>
        <div className="flex items-center gap-2 pt-0.5">
          <Search className="size-3.5 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full text-xs sm:text-[13px] font-medium text-slate-700 focus:outline-none bg-transparent cursor-pointer"
          >
            <option value="all">Search Category...</option>
            {categories
              .filter((cat) => cat !== "All")
              .map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Status Select Pill */}
      <div className="relative w-full sm:w-48 border border-slate-200 rounded-xl px-3.5 py-1.5 focus-within:border-[#0C356A] focus-within:ring-2 focus-within:ring-[#0C356A]/15 transition-all bg-white">
        <span className="absolute -top-2 left-3 px-1 bg-white text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
          Status
        </span>
        <div className="flex items-center gap-2 pt-0.5">
          <Search className="size-3.5 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs sm:text-[13px] font-medium text-slate-700 focus:outline-none bg-transparent cursor-pointer"
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
  );
}
