"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Debounced-friendly search box used by every list toolbar. The parent owns
 * the value (usually `search`/`setSearch` from useAdminListState, which
 * debounce-writes it to the URL).
 */
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
  testId = "list-search",
}: SearchInputProps) {
  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        data-testid={testId}
        className="h-9 pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          data-testid={`${testId}-clear`}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition-colors hover:text-slate-700 cursor-pointer"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
