"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  adminApi,
  type Institute,
  type InstituteListParams,
} from "@/lib/api/admin";
import { queryKeys } from "@/lib/api/queryKeys";
import { getErrorMessage } from "@/lib/api/errors";
import { adminRoleRank } from "@/lib/adminRole";
import type { InstituteFormValues } from "@/lib/validations/adminValidations";
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
import InstituteDialog from "../../components/admin/InstituteDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Institutes list (Phase 3): GET /institutes with name/join-code search,
 * optional organization filter (SUPER_ADMIN), and rank-gated writes -
 * create/delete need ORG_ADMIN+ and only SUPER may move orgs.
 */

const SORTABLE_COLUMNS = ["name", "createdAt"];
const LOOKUP_PARAMS = { page: 1, limit: 100 };
const ALL_ORGS = "all";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function InstitutesContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const list = useAdminListState({ defaultSort: "createdAt" });

  const myRank = adminRoleRank(user?.adminRole);
  const isSuper = myRank >= 3;
  const canWrite = myRank >= 2; // create/delete: ORG_ADMIN+

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Institute | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Institute | null>(null);

  const orgFilter = list.filters.organizationId ?? "";
  const params = useMemo<InstituteListParams>(
    () => ({
      ...list.listParams,
      sort: list.listParams.sort as InstituteListParams["sort"],
      ...(orgFilter ? { organizationId: orgFilter } : {}),
    }),
    [list.listParams, orgFilter],
  );

  const institutesQuery = useQuery({
    queryKey: queryKeys.admin.list("institutes", params),
    queryFn: () => adminApi.listInstitutes(params),
    placeholderData: keepPreviousData,
  });

  // Organization names: only SUPER_ADMIN may call /organizations (403 else).
  const organizationsQuery = useQuery({
    queryKey: queryKeys.admin.list("organizations", LOOKUP_PARAMS),
    queryFn: () => adminApi.listOrganizations(LOOKUP_PARAMS),
    staleTime: 5 * 60_000,
    enabled: isSuper,
  });
  const organizations = useMemo(
    () => organizationsQuery.data?.data ?? [],
    [organizationsQuery.data],
  );
  const organizationNameById = useMemo(
    () => new Map(organizations.map((org) => [org.id, org.name])),
    [organizations],
  );
  const organizationLabel = useCallback(
    (id: string) =>
      isSuper ? (organizationNameById.get(id) ?? `${id.slice(0, 8)}…`) : "—",
    [isSuper, organizationNameById],
  );

  // ---- Mutations -----------------------------------------------------------

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });

  const createMutation = useMutation({
    mutationFn: adminApi.createInstitute,
    onSuccess: () => {
      toast.success("Institute created.");
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
      payload: Parameters<typeof adminApi.updateInstitute>[1];
    }) => adminApi.updateInstitute(id, payload),
    onSuccess: () => {
      toast.success("Institute updated.");
      setDialogOpen(false);
      setEditTarget(null);
      return invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteInstitute,
    onSuccess: () => {
      toast.success("Institute deleted.");
      return invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Couldn't delete the institute.")),
  });

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };
  const openEdit = (institute: Institute) => {
    setEditTarget(institute);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (values: InstituteFormValues) => {
    if (editTarget) {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        payload: {
          name: values.name.trim(),
          ...(values.joinCode ? { joinCode: values.joinCode } : {}),
          ...(isSuper && values.organizationId
            ? { organizationId: values.organizationId }
            : {}),
        },
      });
    } else {
      await createMutation.mutateAsync({
        name: values.name.trim(),
        ...(values.joinCode ? { joinCode: values.joinCode } : {}),
        ...(isSuper && values.organizationId
          ? { organizationId: values.organizationId }
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

  const columns = useMemo<DataTableColumn<Institute>[]>(
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
                disabled: !canWrite,
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
        id: "joinCode",
        accessorKey: "joinCode",
        header: "Join code",
        enableSorting: false,
        cell: ({ row }) => (
          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold tracking-wide text-slate-700">
            {row.original.joinCode}
          </code>
        ),
      },
      {
        id: "organization",
        header: "Organization",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-slate-500">
            {organizationLabel(row.original.organizationId)}
          </span>
        ),
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
    [organizationLabel, canWrite],
  );

  const hasFilters = Boolean(list.q || Object.keys(list.filters).length > 0);
  const clearFilters = () => {
    list.setSearch("");
    for (const key of Object.keys(list.filters)) list.setFilter(key, undefined);
  };

  const meta = institutesQuery.data?.meta;

  return (
    <div className="space-y-5" data-testid="admin-institutes">
      <AdminPageHeader
        title="Institutes"
        description="Tenant units with student join codes, grouped under organizations."
        actions={
          <Button
            type="button"
            onClick={openCreate}
            disabled={!canWrite}
            title={canWrite ? undefined : "Requires Organization Admin or above"}
            data-testid="create-institute"
          >
            <Plus className="size-4" />
            Add institute
          </Button>
        }
      />

      <DataTable<Institute>
        columns={columns}
        data={institutesQuery.data?.data ?? EMPTY_ROWS}
        page={list.page}
        pageSize={list.pageSize}
        total={meta?.total ?? 0}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        sortableColumnIds={SORTABLE_COLUMNS}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        isLoading={!institutesQuery.data}
        isFetching={institutesQuery.isFetching}
        error={
          institutesQuery.isError && !institutesQuery.data
            ? institutesQuery.error
            : undefined
        }
        onRetry={() => institutesQuery.refetch()}
        emptyTitle={hasFilters ? "No matching institutes" : "No institutes yet"}
        emptyDescription={
          hasFilters
            ? "Try a different search or organization filter."
            : "Create the first institute so students can register into it."
        }
        emptyAction={
          hasFilters ? (
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : canWrite ? (
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="size-3.5" />
              Add institute
            </Button>
          ) : undefined
        }
        toolbar={
          <>
            <SearchInput
              value={list.search}
              onChange={list.setSearch}
              placeholder="Search name or join code..."
              testId="institutes-search"
            />
            {isSuper && (
              <Select
                value={orgFilter || ALL_ORGS}
                onValueChange={(value) =>
                  list.setFilter("organizationId", value === ALL_ORGS ? undefined : value)
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-52"
                  aria-label="Filter by organization"
                  data-testid="institutes-org-filter"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ORGS}>All organizations</SelectItem>
                  {organizations.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        }
      />

      <InstituteDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditTarget(null);
        }}
        institute={editTarget}
        organizations={organizations}
        showOrganizationField={isSuper}
        onSubmit={handleDialogSubmit}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.id);
        }}
        title="Delete institute"
        itemName={deleteTarget?.name}
        description={
          <>
            Deleting{" "}
            <span className="font-bold text-slate-800">{deleteTarget?.name}</span>{" "}
            removes its join code. Students tied to it may lose access.
          </>
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default function InstitutesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <span
            role="status"
            aria-label="Loading institutes"
            className="inline-block w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"
          />
        </div>
      }
    >
      <InstitutesContent />
    </Suspense>
  );
}
