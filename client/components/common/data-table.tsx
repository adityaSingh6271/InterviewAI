"use client";

import * as React from "react";
import {
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Inbox,
  TriangleAlert,
} from "lucide-react";

import { getErrorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Reusable server-driven data table (Standards §5/§13: TanStack Table,
 * server-side pagination, sorting, shared column definitions, and the full
 * state set - loading skeleton, empty, no-results, error + retry).
 *
 * Contract with the page that owns it:
 * - the page owns list state (page/pageSize/sorting) - ideally synced to the
 *   URL - and passes it down together with the query result;
 * - `data` must be a STABLE reference (pass a module-scope empty array as the
 *   fallback, e.g. `query.data ?? EMPTY_ROWS`, never an inline `?? []`);
 * - `sortableColumnIds` must list only the sort fields the API allowlists;
 *   pass a stable (module-scope) array.
 */

/** Features registered on every admin table: server sort + server pages. */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
});

export type DataTableFeatures = typeof dataTableFeatures;
export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData>;

/** Stable empty fallback - keeps the `data` reference identical across renders.
 *  Typed `never[]` so it widens into any row type without a cast. */
export const EMPTY_ROWS: never[] = [];

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface DataTableProps<TData extends RowData> {
  columns: DataTableColumn<TData>[];
  /** Current page rows (already fetched server-side). */
  data: TData[];
  /** 1-based page index (server convention). */
  page: number;
  pageSize: number;
  /** Total rows across all pages (response `meta.total`). */
  total: number;
  onPageChange: (page: number) => void;
  /** Omit to hide the page-size selector. */
  onPageSizeChange?: (size: number) => void;
  /** Sortable columns - must match the API's sort allowlist. */
  sortableColumnIds?: string[];
  /** Current sort (server state). Omit together with `onSortingChange`. */
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  /** First load - renders the skeleton. */
  isLoading?: boolean;
  /** Background refetch while data is on screen - dims the body. */
  isFetching?: boolean;
  /** Failed request without data - renders the error state. */
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  /** Toolbar row rendered above the table (search, filters, primary action). */
  toolbar?: React.ReactNode;
  pageSizeOptions?: number[];
  className?: string;
}

/** Page numbers with leading/trailing anchors and ellipses. */
function pageWindow(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const output: (number | "…")[] = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) output.push("…");
    output.push(value);
    previous = value;
  }
  return output;
}

function SortIndicator({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="size-3.5" />;
  if (sorted === "desc") return <ArrowDown className="size-3.5" />;
  return <ArrowUpDown className="size-3.5 opacity-40" />;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  sortableColumnIds,
  sorting = EMPTY_ROWS as SortingState,
  onSortingChange,
  isLoading = false,
  isFetching = false,
  error,
  onRetry,
  emptyTitle = "No results",
  emptyDescription = "Nothing matches the current filters yet.",
  emptyAction,
  toolbar,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className,
}: DataTableProps<TData>) {
  // Derived from a joined key so a fresh inline array literal from the caller
  // does not invalidate the column model on every render.
  const sortableKey = (sortableColumnIds ?? []).join(",");

  const effectiveColumns = React.useMemo<DataTableColumn<TData>[]>(() => {
    if (!onSortingChange) return columns;
    const sortable = new Set(sortableKey.split(",").filter(Boolean));
    return columns.map((column) => {
      const id = String(
        column.id ?? ("accessorKey" in column ? column.accessorKey : ""),
      );
      return { ...column, enableSorting: sortable.has(id) };
    });
  }, [columns, sortableKey, onSortingChange]);

  const canSort = Boolean(onSortingChange) && Boolean(sortableKey);

  const handlePaginationChange = React.useCallback(
    (updater: Updater<PaginationState>) => {
      const current: PaginationState = { pageIndex: page - 1, pageSize };
      const next = typeof updater === "function" ? updater(current) : updater;
      if (next.pageSize !== pageSize) {
        // New page size -> back to the first page (matches filter semantics).
        onPageSizeChange?.(next.pageSize);
        onPageChange(1);
      } else if (next.pageIndex !== page - 1) {
        onPageChange(next.pageIndex + 1);
      }
    },
    [page, pageSize, onPageChange, onPageSizeChange],
  );

  const handleSortingChange = React.useCallback(
    (updater: Updater<SortingState>) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange?.(next);
    },
    [sorting, onSortingChange],
  );

  const table = useTable({
    features: dataTableFeatures,
    columns: effectiveColumns,
    data,
    state: {
      pagination: { pageIndex: page - 1, pageSize },
      sorting,
    },
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    manualPagination: true,
    manualSorting: true,
    rowCount: total,
    autoResetPageIndex: false,
    enableSorting: canSort,
  });

  const pageCount = Math.max(1, table.getPageCount());
  const showSkeleton = isLoading && data.length === 0;
  const showError = Boolean(error) && data.length === 0;
  const showEmpty = !showSkeleton && !showError && data.length === 0;
  const columnCount = effectiveColumns.length || 1;

  if (showError) {
    return (
      <div
        data-testid="data-table-error"
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50/50 px-6 py-14 text-center",
          className,
        )}
      >
        <div className="flex size-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
          <TriangleAlert className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">
            Couldn&apos;t load this list
          </p>
          <p className="text-xs text-slate-500" data-testid="data-table-error-message">
            {getErrorMessage(error, "Something went wrong while loading data.")}
          </p>
        </div>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            data-testid="data-table-retry"
          >
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div data-testid="data-table" className={cn("flex flex-col gap-4", className)}>
      {toolbar && <div className="flex flex-wrap items-center gap-3">{toolbar}</div>}

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const column = header.column;
                    const sortable = column.getCanSort();
                    const sorted = column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : undefined
                        }
                        className="h-11 px-3 text-left align-middle whitespace-nowrap text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 first:pl-4 last:pr-4"
                      >
                        {header.isPlaceholder
                          ? null
                          : sortable ? (
                            <button
                              type="button"
                              onClick={() => column.toggleSorting()}
                              data-testid="data-table-sort"
                              className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 font-inherit text-inherit uppercase tracking-wide transition-colors hover:text-[#0C356A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C356A] cursor-pointer"
                            >
                              {table.FlexRender({ header })}
                              <SortIndicator sorted={sorted} />
                            </button>
                          ) : (
                            table.FlexRender({ header })
                          )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody
              aria-busy={isFetching || undefined}
              className={cn(
                "divide-y divide-slate-100 transition-opacity",
                isFetching && !isLoading && "opacity-60",
              )}
            >
              {showSkeleton &&
                Array.from({ length: Math.min(pageSize, 8) }, (_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`} data-testid="data-row-skeleton">
                    {Array.from({ length: columnCount }, (_, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-3 first:pl-4 last:pr-4">
                        <Skeleton className="h-4 w-full min-w-16" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!showSkeleton &&
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-testid="data-row"
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    {row.getAllCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-3 py-2.5 align-middle text-[13px] text-slate-700 first:pl-4 last:pr-4"
                      >
                        {table.FlexRender({ cell })}
                      </td>
                    ))}
                  </tr>
                ))}

              {showEmpty && (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <Inbox className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900" data-testid="data-table-empty-title">
                          {emptyTitle}
                        </p>
                        <p className="text-xs text-slate-500">{emptyDescription}</p>
                      </div>
                      {emptyAction}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={page}
          pageSize={pageSize}
          pageCount={pageCount}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={pageSizeOptions}
        />
      </div>
    </div>
  );
}

interface TablePaginationProps {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions: number[];
}

function TablePagination({
  page,
  pageSize,
  pageCount,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
}: TablePaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const canPrevious = page > 1;
  const canNext = page < pageCount;

  return (
    <div
      data-testid="data-table-pagination"
      className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>
          {total === 0
            ? "No rows"
            : `Showing ${start}\u2013${end} of ${total}`}
        </span>
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5">
            <span className="whitespace-nowrap">Rows</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              data-testid="data-table-page-size"
              className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-xs outline-none focus-visible:border-[#0C356A] focus-visible:ring-2 focus-visible:ring-[#0C356A]/20"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1">
        <PaginationButton
          label="First page"
          testId="pagination-first"
          disabled={!canPrevious}
          onClick={() => onPageChange(1)}
        >
          <ChevronFirst className="size-4" />
        </PaginationButton>
        <PaginationButton
          label="Previous page"
          testId="pagination-prev"
          disabled={!canPrevious}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </PaginationButton>

        <div className="flex items-center gap-1 px-1">
          {pageWindow(page, pageCount).map((entry, index) =>
            entry === "…" ? (
              <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-slate-400">
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onPageChange(entry)}
                aria-current={entry === page ? "page" : undefined}
                aria-label={`Page ${entry}`}
                data-testid="data-table-page"
                data-page={entry}
                className={cn(
                  "h-8 min-w-8 cursor-pointer rounded-lg px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C356A]",
                  entry === page
                    ? "bg-[#0C356A] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {entry}
              </button>
            ),
          )}
        </div>

        <PaginationButton
          label="Next page"
          testId="pagination-next"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </PaginationButton>
        <PaginationButton
          label="Last page"
          testId="pagination-last"
          disabled={!pageCount || page >= pageCount}
          onClick={() => onPageChange(pageCount)}
        >
          <ChevronLast className="size-4" />
        </PaginationButton>
      </div>
    </div>
  );
}

function PaginationButton({
  label,
  testId,
  disabled,
  onClick,
  children,
}: {
  label: string;
  testId: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C356A] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
