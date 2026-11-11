"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { SortingState } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { ClipboardList, Trash2 } from "lucide-react";

import {
  SERVER_INTERVIEW_STATUSES,
  adminApi,
  type InterviewListParams,
} from "@/lib/api/admin";
import { interviewsApi, type ServerInterview, type ServerInterviewStatus } from "@/lib/api/interviews";
import type { User } from "@/lib/api/types";
import { queryKeys } from "@/lib/api/queryKeys";
import { getErrorMessage } from "@/lib/api/errors";
import { adminRoleRank } from "@/lib/adminRole";
import { useAdminListState } from "@/lib/hooks/useAdminListState";
import { useAuth } from "../../components/providers/AuthProvider";
import AdminPageHeader from "@/components/common/admin-page-header";
import SearchInput from "@/components/common/search-input";
import RowActions from "@/components/common/row-actions";
import { StatusBadge, INTERVIEW_STATUS_STYLES, humanizeStatus } from "@/components/common/status-badge";
import {
  DataTable,
  EMPTY_ROWS,
  type DataTableColumn,
} from "@/components/common/data-table";
import DeleteConfirmationModal from "@/components/common/delete-confirmation-modal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Interview oversight (Phase 5): GET /interviews scoped like the student
 * portal but admin-wide (drafts included), with status moves, deep links
 * into each interview's applications, and in-scope delete.
 */

const SORTABLE_COLUMNS = ["title", "status", "createdAt"];
const LOOKUP_PARAMS = { page: 1, limit: 100 };
const ANY_STATUS = "all";
const ANY_INSTITUTE = "all";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function InterviewsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const list = useAdminListState({ defaultSort: "createdAt" });

  const isSuper = adminRoleRank(user?.adminRole) >= 3;

  const [deleteTarget, setDeleteTarget] = useState<ServerInterview | null>(null);

  const statusFilter = list.filters.status ?? "";
  const instituteFilter = list.filters.instituteId ?? "";
  const params = useMemo<InterviewListParams>(
    () => ({
      ...list.listParams,
      sort: list.listParams.sort as InterviewListParams["sort"],
      ...(statusFilter ? { status: statusFilter as InterviewListParams["status"] } : {}),
      ...(instituteFilter ? { instituteId: instituteFilter } : {}),
    }),
    [list.listParams, statusFilter, instituteFilter],
  );

  const interviewsQuery = useQuery({
    queryKey: queryKeys.admin.list("interviews", params),
    queryFn: () => interviewsApi.list(params),
    placeholderData: keepPreviousData,
  });

  // Institute names for the scope column + SUPER filter.
  const institutesQuery = useQuery({
    queryKey: queryKeys.admin.list("institutes", LOOKUP_PARAMS),
    queryFn: () => adminApi.listInstitutes(LOOKUP_PARAMS),
    staleTime: 5 * 60_000,
  });
  const institutes = useMemo(
    () => institutesQuery.data?.data ?? [],
    [institutesQuery.data],
  );
  const instituteNameById = useMemo(
    () => new Map(institutes.map((institute) => [institute.id, institute.name])),
    [institutes],
  );
  const instituteLabel = useCallback(
    (id: string) => (id ? (instituteNameById.get(id) ?? `${id.slice(0, 8)}…`) : "—"),
    [instituteNameById],
  );

  // Creator names: interviews are created by students (wizard) or admins,
  // so resolve `createdBy` against both identity tables (first page each;
  // unknown ids fall back to a short id).
  const studentsQuery = useQuery({
    queryKey: queryKeys.admin.list("students", LOOKUP_PARAMS),
    queryFn: () => adminApi.listStudents(LOOKUP_PARAMS),
    staleTime: 5 * 60_000,
  });
  const adminsQuery = useQuery({
    queryKey: queryKeys.admin.list("admins", LOOKUP_PARAMS),
    queryFn: () => adminApi.listAdmins(LOOKUP_PARAMS),
    staleTime: 5 * 60_000,
  });
  const creatorById = useMemo(() => {
    const map = new Map<string, User>();
    for (const student of studentsQuery.data?.data ?? []) map.set(student.id, student);
    for (const admin of adminsQuery.data?.data ?? []) map.set(admin.id, admin);
    return map;
  }, [studentsQuery.data, adminsQuery.data]);

  // ---- Mutations -----------------------------------------------------------

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ServerInterviewStatus }) =>
      interviewsApi.update(id, { status }),
    onSuccess: (_result, variables) => {
      toast.success(`Interview moved to ${humanizeStatus(variables.status)}.`);
      return invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Couldn't change the status.")),
  });

  const deleteMutation = useMutation({
    mutationFn: interviewsApi.remove,
    onSuccess: () => {
      toast.success("Interview deleted.");
      return invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Couldn't delete the interview.")),
  });

  // ---- Table ---------------------------------------------------------------

  const sorting = useMemo<SortingState>(
    () => [{ id: list.sort, desc: list.order === "desc" }],
    [list.sort, list.order],
  );

  const handleSortingChange = useCallback(
    (next: SortingState) => {
      const first = next[0];
      if (!first) list.setSort("createdAt", "desc");
      else list.setSort(first.id, first.desc ? "desc" : "asc");
    },
    [list],
  );

  const columns = useMemo<DataTableColumn<ServerInterview>[]>(
    () => [
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            actions={[
              {
                label: "Applications",
                icon: ClipboardList,
                onSelect: () =>
                  router.push(`/admin/applications?interviewId=${row.original.id}`),
                testId: "row-applications",
              },
              ...SERVER_INTERVIEW_STATUSES.filter(
                (status) => status !== row.original.status,
              ).map((status) => ({
                label: `Move to ${humanizeStatus(status)}`,
                onSelect: () =>
                  statusMutation.mutate({ id: row.original.id, status }),
                testId: `row-status-${status}`,
              })),
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
        id: "title",
        accessorKey: "title",
        header: "Interview",
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="font-medium text-slate-900">{row.original.title}</span>
            {row.original.company && (
              <p className="truncate text-xs text-slate-400">{row.original.company}</p>
            )}
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            variant={INTERVIEW_STATUS_STYLES[row.original.status].variant}
            testId="row-status"
          >
            {humanizeStatus(row.original.status)}
          </StatusBadge>
        ),
      },
      {
        id: "institute",
        header: "Institute",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-slate-500">{instituteLabel(row.original.instituteId)}</span>
        ),
      },
      {
        id: "createdBy",
        header: "Created by",
        enableSorting: false,
        cell: ({ row }) => {
          const creator = row.original.createdBy
            ? creatorById.get(row.original.createdBy)
            : undefined;
          if (!creator) {
            return (
              <span className="text-slate-400">
                {row.original.createdBy ? `${row.original.createdBy.slice(0, 8)}…` : "—"}
              </span>
            );
          }
          return (
            <div className="min-w-0">
              <span className="font-medium text-slate-700">{creator.name}</span>
              <p className="truncate text-xs text-slate-400">
                {creator.adminRole ? "Admin" : "Student"} · {creator.email}
              </p>
            </div>
          );
        },
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-slate-500">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [instituteLabel, creatorById, router, statusMutation],
  );

  const hasFilters = Boolean(list.q || Object.keys(list.filters).length > 0);
  const clearFilters = () => {
    list.setSearch("");
    for (const key of Object.keys(list.filters)) list.setFilter(key, undefined);
  };

  const meta = interviewsQuery.data?.meta;

  return (
    <div className="space-y-5" data-testid="admin-interviews">
      <AdminPageHeader
        title="Interviews"
        description="Every interview in your scope, drafts included, with pipeline controls."
      />

      <DataTable<ServerInterview>
        columns={columns}
        data={interviewsQuery.data?.data ?? EMPTY_ROWS}
        page={list.page}
        pageSize={list.pageSize}
        total={meta?.total ?? 0}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        sortableColumnIds={SORTABLE_COLUMNS}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        isLoading={!interviewsQuery.data}
        isFetching={interviewsQuery.isFetching}
        error={
          interviewsQuery.isError && !interviewsQuery.data
            ? interviewsQuery.error
            : undefined
        }
        onRetry={() => interviewsQuery.refetch()}
        emptyTitle={hasFilters ? "No matching interviews" : "No interviews yet"}
        emptyDescription={
          hasFilters
            ? "Try a different search, status, or institute filter."
            : "Interviews created from the candidate portal appear here."
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
            <SearchInput
              value={list.search}
              onChange={list.setSearch}
              placeholder="Search title or description..."
              testId="interviews-search"
            />
            <Select
              value={statusFilter || ANY_STATUS}
              onValueChange={(value) =>
                list.setFilter("status", value === ANY_STATUS ? undefined : value)
              }
            >
              <SelectTrigger
                size="sm"
                className="w-40"
                aria-label="Filter by status"
                data-testid="interviews-status-filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_STATUS}>All statuses</SelectItem>
                {SERVER_INTERVIEW_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {humanizeStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSuper && (
              <Select
                value={instituteFilter || ANY_INSTITUTE}
                onValueChange={(value) =>
                  list.setFilter("instituteId", value === ANY_INSTITUTE ? undefined : value)
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-48"
                  aria-label="Filter by institute"
                  data-testid="interviews-institute-filter"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_INSTITUTE}>All institutes</SelectItem>
                  {institutes.map((institute) => (
                    <SelectItem key={institute.id} value={institute.id}>
                      {institute.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        }
      />

      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.id);
        }}
        title="Delete interview"
        itemName={deleteTarget?.title}
        description={
          <>
            Deleting{" "}
            <span className="font-bold text-slate-800">{deleteTarget?.title}</span>{" "}
            removes its rounds, questions, and application pipeline. This cannot
            be undone.
          </>
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default function InterviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <span
            role="status"
            aria-label="Loading interviews"
            className="inline-block w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"
          />
        </div>
      }
    >
      <InterviewsContent />
    </Suspense>
  );
}
