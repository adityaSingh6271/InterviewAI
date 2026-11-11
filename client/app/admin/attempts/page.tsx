"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { Sparkles, Trash2, X, CheckCircle2 } from "lucide-react";

import {
  ATTEMPT_STATUSES,
  adminApi,
  type AttemptListParams,
  type AttemptStatus,
  type ServerRoundAttempt,
} from "@/lib/api/admin";
import { interviewsApi, type ServerInterview } from "@/lib/api/interviews";
import type { User } from "@/lib/api/types";
import { queryKeys } from "@/lib/api/queryKeys";
import { getErrorMessage } from "@/lib/api/errors";
import { useAdminListState } from "@/lib/hooks/useAdminListState";
import AdminPageHeader from "@/components/common/admin-page-header";
import RowActions from "@/components/common/row-actions";
import {
  StatusBadge,
  ATTEMPT_STATUS_STYLES,
  humanizeStatus,
} from "@/components/common/status-badge";
import {
  DataTable,
  EMPTY_ROWS,
  type DataTableColumn,
} from "@/components/common/data-table";
import DeleteConfirmationModal from "@/components/common/delete-confirmation-modal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Round-attempt oversight (Phase 5): the admin-wide attempt list with status
 * filter, scope chips (student/interview/round arrive as URL params from
 * other screens), mark-evaluated, AI re-scoring, and delete. No search box -
 * this endpoint has no search column.
 */

const SORTABLE_COLUMNS = ["startedAt", "status", "createdAt"];
const LOOKUP_PARAMS = { page: 1, limit: 100 };
const ANY_STATUS = "all";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function AttemptsContent() {
  const queryClient = useQueryClient();
  const list = useAdminListState({ defaultSort: "startedAt" });

  const [deleteTarget, setDeleteTarget] = useState<ServerRoundAttempt | null>(null);

  const statusFilter = list.filters.status ?? "";
  const studentFilter = list.filters.studentId ?? "";
  const interviewFilter = list.filters.interviewId ?? "";
  const roundFilter = list.filters.roundId ?? "";

  const params = useMemo<AttemptListParams>(
    () => ({
      ...list.listParams,
      sort: list.listParams.sort as AttemptListParams["sort"],
      ...(statusFilter ? { status: statusFilter as AttemptStatus } : {}),
      ...(studentFilter ? { studentId: studentFilter } : {}),
      ...(interviewFilter ? { interviewId: interviewFilter } : {}),
      ...(roundFilter ? { roundId: roundFilter } : {}),
    }),
    [list.listParams, statusFilter, studentFilter, interviewFilter, roundFilter],
  );

  const attemptsQuery = useQuery({
    queryKey: queryKeys.admin.list("attempts", params),
    queryFn: () => adminApi.listAttempts(params),
    placeholderData: keepPreviousData,
  });

  // Label lookups for rows + scope chips (shared cache entries with the
  // other admin pages - identical key shapes).
  const studentsQuery = useQuery({
    queryKey: queryKeys.admin.list("students", LOOKUP_PARAMS),
    queryFn: () => adminApi.listStudents(LOOKUP_PARAMS),
    staleTime: 5 * 60_000,
  });
  const interviewsQuery = useQuery({
    queryKey: queryKeys.admin.list("interviews", LOOKUP_PARAMS),
    queryFn: () => interviewsApi.list(LOOKUP_PARAMS),
    staleTime: 5 * 60_000,
  });

  const studentById = useMemo(
    () =>
      new Map<string, User>(
        (studentsQuery.data?.data ?? []).map((student) => [student.id, student]),
      ),
    [studentsQuery.data],
  );
  const interviewById = useMemo(
    () =>
      new Map<string, ServerInterview>(
        (interviewsQuery.data?.data ?? []).map((interview) => [interview.id, interview]),
      ),
    [interviewsQuery.data],
  );

  const studentLabel = useCallback(
    (id: string) => studentById.get(id)?.name ?? `${id.slice(0, 8)}…`,
    [studentById],
  );

  // ---- Scope chips (filters that arrived via URL) --------------------------

  const activeFilters: Array<{ key: string; label: string }> = [];
  if (studentFilter) {
    activeFilters.push({
      key: "studentId",
      label: `Student: ${studentLabel(studentFilter)}`,
    });
  }
  if (interviewFilter) {
    activeFilters.push({
      key: "interviewId",
      label: `Interview: ${interviewById.get(interviewFilter)?.title ?? `${interviewFilter.slice(0, 8)}…`}`,
    });
  }
  if (roundFilter) {
    activeFilters.push({ key: "roundId", label: `Round: ${roundFilter.slice(0, 8)}…` });
  }

  // ---- Mutations -----------------------------------------------------------

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all });
  };

  const evaluateMutation = useMutation({
    mutationFn: adminApi.evaluateAttempt,
    onSuccess: (result) => {
      if (result.meta && Boolean(result.meta.failed)) {
        toast.error(
          "AI evaluation ran but failed - check the organization's LLM configuration.",
        );
      } else {
        toast.success("AI evaluation complete.");
      }
      return invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Couldn't run AI evaluation.")),
  });

  const markEvaluatedMutation = useMutation({
    mutationFn: (id: string) => adminApi.updateAttemptStatus(id, "EVALUATED"),
    onSuccess: () => {
      toast.success("Attempt marked as evaluated.");
      return invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Couldn't update the attempt.")),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteAttempt,
    onSuccess: () => {
      toast.success("Attempt deleted.");
      return invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Couldn't delete the attempt.")),
  });

  // ---- Table ---------------------------------------------------------------

  const sorting = useMemo<SortingState>(
    () => [{ id: list.sort, desc: list.order === "desc" }],
    [list.sort, list.order],
  );

  const handleSortingChange = useCallback(
    (next: SortingState) => {
      const first = next[0];
      if (!first) list.setSort("startedAt", "desc");
      else list.setSort(first.id, first.desc ? "desc" : "asc");
    },
    [list],
  );

  const columns = useMemo<DataTableColumn<ServerRoundAttempt>[]>(
    () => [
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            actions={[
              {
                label: "Mark evaluated",
                icon: CheckCircle2,
                onSelect: () => markEvaluatedMutation.mutate(row.original.id),
                disabled: row.original.status !== "COMPLETED",
                testId: "row-mark-evaluated",
              },
              {
                label: "Re-run AI evaluation",
                icon: Sparkles,
                onSelect: () => evaluateMutation.mutate(row.original.id),
                disabled: row.original.status === "IN_PROGRESS",
                testId: "row-evaluate",
              },
              {
                label: "Delete",
                icon: Trash2,
                destructive: true,
                onSelect: () => setDeleteTarget(row.original),
                testId: "row-delete",
              },
            ]}
          />
        ),
      },
      {
        id: "student",
        header: "Student",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="font-medium text-slate-900">
              {studentLabel(row.original.studentId)}
            </span>
            <p className="truncate text-xs text-slate-400">
              Round {row.original.roundId.slice(0, 8)}…
            </p>
          </div>
        ),
      },
      {
        id: "attemptNumber",
        accessorKey: "attemptNumber",
        header: "Attempt",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-slate-600">
            #{row.original.attemptNumber}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            variant={ATTEMPT_STATUS_STYLES[row.original.status].variant}
            testId="row-status"
          >
            {humanizeStatus(row.original.status)}
          </StatusBadge>
        ),
      },
      {
        id: "aiScore",
        accessorKey: "aiScore",
        header: "AI score",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.aiScore == null ? (
            <span className="text-slate-300">—</span>
          ) : (
            <span className="font-semibold tabular-nums text-slate-800">
              {row.original.aiScore}
            </span>
          ),
      },
      {
        id: "startedAt",
        accessorKey: "startedAt",
        header: "Started",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-slate-500">
            {formatDate(row.original.startedAt)}
          </span>
        ),
      },
    ],
    [studentLabel, markEvaluatedMutation, evaluateMutation],
  );

  const hasFilters = Boolean(list.q || Object.keys(list.filters).length > 0);
  const clearFilters = () => {
    list.setSearch("");
    for (const key of Object.keys(list.filters)) list.setFilter(key, undefined);
  };

  const meta = attemptsQuery.data?.meta;

  return (
    <div className="space-y-5" data-testid="admin-attempts">
      <AdminPageHeader
        title="Round attempts"
        description="Every candidate attempt across rounds, with evaluation controls."
      />

      <DataTable<ServerRoundAttempt>
        columns={columns}
        data={attemptsQuery.data?.data ?? EMPTY_ROWS}
        page={list.page}
        pageSize={list.pageSize}
        total={meta?.total ?? 0}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        sortableColumnIds={SORTABLE_COLUMNS}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        isLoading={!attemptsQuery.data}
        isFetching={attemptsQuery.isFetching}
        error={attemptsQuery.isError && !attemptsQuery.data ? attemptsQuery.error : undefined}
        onRetry={() => attemptsQuery.refetch()}
        emptyTitle={hasFilters ? "No matching attempts" : "No attempts yet"}
        emptyDescription={
          hasFilters
            ? "Try a different status filter or clear the scope filters."
            : "Attempts appear here as candidates work through rounds."
        }
        emptyAction={
          hasFilters ? (
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : undefined
        }
        toolbar={
          <>
            {activeFilters.map((filter) => (
              <span
                key={filter.key}
                className="inline-flex max-w-72 items-center gap-1.5 rounded-full bg-[#0C356A]/10 px-3 py-1.5 text-xs font-medium text-[#0C356A]"
                data-testid={`${filter.key}-filter-chip`}
              >
                <span className="truncate">{filter.label}</span>
                <button
                  type="button"
                  aria-label={`Clear ${filter.key} filter`}
                  onClick={() => list.setFilter(filter.key, undefined)}
                  className="rounded-full p-0.5 transition-colors hover:bg-[#0C356A]/15 cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <Select
              value={statusFilter || ANY_STATUS}
              onValueChange={(value) =>
                list.setFilter("status", value === ANY_STATUS ? undefined : value)
              }
            >
              <SelectTrigger
                size="sm"
                className="w-44"
                aria-label="Filter by status"
                data-testid="attempts-status-filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_STATUS}>All statuses</SelectItem>
                {ATTEMPT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {humanizeStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.id);
        }}
        title="Delete attempt"
        description={
          <>
            This removes attempt #{deleteTarget?.attemptNumber} and its stored
            evaluation. This cannot be undone.
          </>
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default function AttemptsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <span
            role="status"
            aria-label="Loading attempts"
            className="inline-block w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"
          />
        </div>
      }
    >
      <AttemptsContent />
    </Suspense>
  );
}
