"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  adminApi,
  type StudentListParams,
} from "@/lib/api/admin";
import type { User } from "@/lib/api/types";
import { queryKeys } from "@/lib/api/queryKeys";
import { getErrorMessage } from "@/lib/api/errors";
import { adminRoleRank } from "@/lib/adminRole";
import type { StudentFormValues } from "@/lib/validations/adminValidations";
import { useAdminListState } from "@/lib/hooks/useAdminListState";
import { useAuth } from "../../components/providers/AuthProvider";
import AdminPageHeader from "@/components/common/admin-page-header";
import SearchInput from "@/components/common/search-input";
import RowActions from "@/components/common/row-actions";
import {
  DataTable,
  EMPTY_ROWS,
  type DataTableColumn,
} from "@/components/common/data-table";
import DeleteConfirmationModal from "@/components/common/delete-confirmation-modal";
import StudentDialog from "../../components/admin/StudentDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Students list (Phase 3): GET /students with name/email search, an
 * institute filter for SUPER_ADMIN, and rank-scoped create/edit/delete
 * (every other role is pinned to its own institute server-side).
 */

const SORTABLE_COLUMNS = ["name", "email", "createdAt"];
const INSTITUTE_LOOKUP = { page: 1, limit: 100 };
const ALL_INSTITUTES = "all";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function StudentsContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const list = useAdminListState({ defaultSort: "createdAt" });

  const isSuper = adminRoleRank(user?.adminRole) >= 3;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const instituteFilter = list.filters.instituteId ?? "";
  const params = useMemo<StudentListParams>(
    () => ({
      ...list.listParams,
      sort: list.listParams.sort as StudentListParams["sort"],
      ...(instituteFilter ? { instituteId: instituteFilter } : {}),
    }),
    [list.listParams, instituteFilter],
  );

  const studentsQuery = useQuery({
    queryKey: queryKeys.admin.list("students", params),
    queryFn: () => adminApi.listStudents(params),
    placeholderData: keepPreviousData,
  });

  // Institute names: column labels, SUPER filter, dialog choices.
  const institutesQuery = useQuery({
    queryKey: queryKeys.admin.list("institutes", INSTITUTE_LOOKUP),
    queryFn: () => adminApi.listInstitutes(INSTITUTE_LOOKUP),
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

  // ---- Mutations -----------------------------------------------------------

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });

  const createMutation = useMutation({
    mutationFn: adminApi.createStudent,
    onSuccess: () => {
      toast.success("Student account created.");
      setDialogOpen(false);
      return invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof adminApi.updateStudent>[1];
    }) => adminApi.updateStudent(id, payload),
    onSuccess: () => {
      toast.success("Student account updated.");
      setDialogOpen(false);
      setEditTarget(null);
      return invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteStudent,
    onSuccess: () => {
      toast.success("Student account deleted.");
      return invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Couldn't delete the student.")),
  });

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };
  const openEdit = (student: User) => {
    setEditTarget(student);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (values: StudentFormValues) => {
    if (editTarget) {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        payload: {
          name: values.name.trim(),
          email: values.email.trim(),
          ...(values.password ? { password: values.password } : {}),
          ...(isSuper && values.instituteId
            ? { instituteId: values.instituteId }
            : {}),
        },
      });
    } else {
      await createMutation.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password ?? "",
        ...(isSuper && values.instituteId
          ? { instituteId: values.instituteId }
          : {}),
      });
    }
  };

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

  const columns = useMemo<DataTableColumn<User>[]>(
    () => [
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            actions={[
              {
                label: "Edit",
                icon: Pencil,
                onSelect: () => openEdit(row.original),
                testId: "row-edit",
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
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium text-slate-900">{row.original.name}</span>
        ),
      },
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <span className="text-slate-500">{row.original.email}</span>,
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
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-slate-500">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [instituteLabel],
  );

  const hasFilters = Boolean(list.q || Object.keys(list.filters).length > 0);
  const clearFilters = () => {
    list.setSearch("");
    for (const key of Object.keys(list.filters)) list.setFilter(key, undefined);
  };

  const meta = studentsQuery.data?.meta;

  return (
    <div className="space-y-5" data-testid="admin-students">
      <AdminPageHeader
        title="Students"
        description="Candidate accounts that register into institutes and take interviews."
        actions={
          <Button type="button" onClick={openCreate} data-testid="create-student">
            <Plus className="size-4" />
            Add student
          </Button>
        }
      />

      <DataTable<User>
        columns={columns}
        data={studentsQuery.data?.data ?? EMPTY_ROWS}
        page={list.page}
        pageSize={list.pageSize}
        total={meta?.total ?? 0}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        sortableColumnIds={SORTABLE_COLUMNS}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        isLoading={!studentsQuery.data}
        isFetching={studentsQuery.isFetching}
        error={studentsQuery.isError && !studentsQuery.data ? studentsQuery.error : undefined}
        onRetry={() => studentsQuery.refetch()}
        emptyTitle={hasFilters ? "No matching students" : "No students yet"}
        emptyDescription={
          hasFilters
            ? "Try a different search or institute filter."
            : "Provision the first student account or share a join code."
        }
        emptyAction={
          hasFilters ? (
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="size-3.5" />
              Add student
            </Button>
          )
        }
        toolbar={
          <>
            <SearchInput
              value={list.search}
              onChange={list.setSearch}
              placeholder="Search name or email..."
              testId="students-search"
            />
            {isSuper && (
              <Select
                value={instituteFilter || ALL_INSTITUTES}
                onValueChange={(value) =>
                  list.setFilter("instituteId", value === ALL_INSTITUTES ? undefined : value)
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-52"
                  aria-label="Filter by institute"
                  data-testid="students-institute-filter"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_INSTITUTES}>All institutes</SelectItem>
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

      <StudentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditTarget(null);
        }}
        student={editTarget}
        institutes={institutes}
        showInstituteField={isSuper}
        onSubmit={handleDialogSubmit}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.id);
        }}
        title="Delete student account"
        itemName={deleteTarget?.name}
        description={
          <>
            This permanently removes{" "}
            <span className="font-bold text-slate-800">{deleteTarget?.name}</span>
            &apos;s account and their access to interviews.
          </>
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <span
            role="status"
            aria-label="Loading students"
            className="inline-block w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"
          />
        </div>
      }
    >
      <StudentsContent />
    </Suspense>
  );
}
