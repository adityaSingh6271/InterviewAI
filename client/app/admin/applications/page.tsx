"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { Trash2, X } from "lucide-react";

import {
  APPLICATION_STATUSES,
  adminApi,
  type ApplicationListParams,
  type ApplicationStatus,
  type ServerStudentApplication,
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
  APPLICATION_STATUS_STYLES,
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
 * Application pipeline (Phase 5): GET /student-applications for the acting
 * admin's scope, with status moves per row and a status filter. The
 * `interviewId` filter arrives as a URL param from the interviews page and
 * renders as a clearable chip. No search box: this endpoint has no search
 * column (a dead input would lie to the operator).
 */

const SORTABLE_COLUMNS = ["appliedAt", "status", "createdAt"];
const LOOKUP_LIMIT = 100;
const ANY_STATUS = "all";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function ApplicationsContent() {
  const queryClient = useQueryClient();
  const list = useAdminListState({ defaultSort: "appliedAt" });

  const [deleteTarget, setDeleteTarget] = useState<ServerStudentApplication | null>(null);

  const statusFilter = list.filters.status ?? "";
  const interviewFilter = list.filters.interviewId ?? "";
  const params = useMemo<ApplicationListParams>(
    () => ({
      ...list.listParams,
      sort: list.listParams.sort as ApplicationListParams["sort"],
      ...(statusFilter ? { status: statusFilter as ApplicationStatus } : {}),
      ...(interviewFilter ? { interviewId: interviewFilter } : {}),
    }),
    [list.listParams, statusFilter, interviewFilter],
  );

  const applicationsQuery = useQuery({
    queryKey: queryKeys.admin.list("applications", params),
    queryFn: () => adminApi.listApplications(params),
    placeholderData: keepPreviousData,
  });

  // Label lookups: student name + interview title for each row (first page
  // of each; unmatched rows fall back to a short id).
  const studentsQuery = useQuery({
    queryKey: queryKeys.admin.list("students", { page: 1, limit: LOOKUP_LIMIT }),
    queryFn: () => adminApi.listStudents({ page: 1, limit: LOOKUP_LIMIT }),
    staleTime: 5 * 60_000,
  });
  const interviewsQuery = useQuery({
    queryKey: queryKeys.admin.list("interviews", { page: 1, limit: LOOKUP_LIMIT }),
    queryFn: () => interviewsApi.list({ page: 1, limit: LOOKUP_LIMIT }),
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
  const interviewLabel = useCallback(
    (id: string) => interviewById.get(id)?.title ?? `${id.slice(0, 8)}…`,
    [interviewById],
  );
  const activeInterviewTitle = interviewFilter
    ? interviewById.get(interviewFilter)?.title ?? `${interviewFilter.slice(0, 8)}…`
    : null;

  // ---- Mutations -----------------------------------------------------------

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      adminApi.updateApplicationStatus(id, status),
    onSuccess: (_result, variables) => {
      toast.success(`Application marked ${humanizeStatus(variables.status)}.`);
      return invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Couldn't change the status.")),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteApplication,
    onSuccess: () => {
      toast.success("Application removed.");
      return invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Couldn't remove the application.")),
  });

  // ---- Table ---------------------------------------------------------------

  const sorting = useMemo<SortingState>(
    () => [{ id: list.sort, desc: list.order === "desc" }],
    [list.sort, list.order],
  );

  const handleSortingChange = useCallback(
    (next: SortingState) => {
      const first = next[0];
      if (!first) list.setSort("appliedAt", "desc");
      else list.setSort(first.id, first.desc ? "desc" : "asc");
    },
    [list],
  );

  const columns = useMemo<DataTableColumn<ServerStudentApplication>[]>(
    () => [
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            actions={[
              ...APPLICATION_STATUSES.filter(
                (status) => status !== row.original.status,
              ).map((status) => ({
                label: `Move to ${humanizeStatus(status)}`,
                onSelect: () =>
                  statusMutation.mutate({ id: row.original.id, status }),
                testId: `row-status-${status}`,
              })),
              {
                label: "Remove",
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
            <p className="truncate text-xs text-slate-400">{row.original.studentId}</p>
          </div>
        ),
      },
      {
        id: "interview",
        header: "Interview",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-slate-600">{interviewLabel(row.original.interviewId)}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            variant={APPLICATION_STATUS_STYLES[row.original.status].variant}
            testId="row-status"
          >
            {humanizeStatus(row.original.status)}
          </StatusBadge>
        ),
      },
      {
        id: "appliedAt",
        accessorKey: "appliedAt",
        header: "Applied",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-slate-500">
            {formatDate(row.original.appliedAt)}
          </span>
        ),
      },
    ],
    [studentLabel, interviewLabel, statusMutation],
  );

  const hasFilters = Boolean(list.q || Object.keys(list.filters).length > 0);
  const clearFilters = () => {
    list.setSearch("");
    for (const key of Object.keys(list.filters)) list.setFilter(key, undefined);
  };

  const meta = applicationsQuery.data?.meta;

  return (
    <div className="space-y-5" data-testid="admin-applications">
      <AdminPageHeader
        title="Applications"
        description="The candidate pipeline: review rows and move them between stages."
      />

      <DataTable<ServerStudentApplication>
        columns={columns}
        data={applicationsQuery.data?.data ?? EMPTY_ROWS}
        page={list.page}
        pageSize={list.pageSize}
        total={meta?.total ?? 0}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        sortableColumnIds={SORTABLE_COLUMNS}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        isLoading={!applicationsQuery.data}
        isFetching={applicationsQuery.isFetching}
        error={
          applicationsQuery.isError && !applicationsQuery.data
            ? applicationsQuery.error
            : undefined
        }
        onRetry={() => applicationsQuery.refetch()}
        emptyTitle={hasFilters ? "No matching applications" : "No applications yet"}
        emptyDescription={
          hasFilters
            ? "Try a different status filter or clear the interview filter."
            : "Applications submitted by candidates appear here."
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
            {interviewFilter && (
              <span
                className="inline-flex max-w-72 items-center gap-1.5 rounded-full bg-[#0C356A]/10 px-3 py-1.5 text-xs font-medium text-[#0C356A]"
                data-testid="interview-filter-chip"
              >
                <span className="truncate">Interview: {activeInterviewTitle}</span>
                <button
                  type="button"
                  aria-label="Clear interview filter"
                  onClick={() => list.setFilter("interviewId", undefined)}
                  className="rounded-full p-0.5 transition-colors hover:bg-[#0C356A]/15 cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
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
                data-testid="applications-status-filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_STATUS}>All statuses</SelectItem>
                {APPLICATION_STATUSES.map((status) => (
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
        title="Remove application"
        description={
          <>
            Remove this application from the pipeline? The candidate&apos;s
            attempt history is not affected.
          </>
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <span
            role="status"
            aria-label="Loading applications"
            className="inline-block w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"
          />
        </div>
      }
    >
      <ApplicationsContent />
    </Suspense>
  );
}
