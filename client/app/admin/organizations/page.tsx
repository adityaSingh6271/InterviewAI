"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { SortingState } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { ArrowLeft, Pencil, Plus, SlidersHorizontal, Trash2, ShieldOff } from "lucide-react";

import { adminApi, type Organization, type OrganizationListParams } from "@/lib/api/admin";
import { queryKeys } from "@/lib/api/queryKeys";
import { getErrorMessage } from "@/lib/api/errors";
import { adminRoleRank } from "@/lib/adminRole";
import type { OrganizationFormValues } from "@/lib/validations/adminValidations";
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
import OrganizationDialog from "../../components/admin/OrganizationDialog";
import { Button } from "@/components/ui/button";

/**
 * Organizations list (Phase 4): SUPER_ADMIN only - the router answers 403 to
 * anyone else, and this page shows an access panel instead of calling the API
 * (RBAC-aware UI, Standards §12). Each row links into its LLM configurations.
 */

const SORTABLE_COLUMNS = ["name", "createdAt"];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function OrganizationsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const list = useAdminListState({ defaultSort: "createdAt" });

  const isSuper = adminRoleRank(user?.adminRole) >= 3;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Organization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);

  const params = useMemo<OrganizationListParams>(
    () => ({
      ...list.listParams,
      sort: list.listParams.sort as OrganizationListParams["sort"],
    }),
    [list.listParams],
  );

  const organizationsQuery = useQuery({
    queryKey: queryKeys.admin.list("organizations", params),
    queryFn: () => adminApi.listOrganizations(params),
    placeholderData: keepPreviousData,
    enabled: isSuper,
  });

  // ---- Mutations -----------------------------------------------------------

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });

  const createMutation = useMutation({
    mutationFn: adminApi.createOrganization,
    onSuccess: () => {
      toast.success("Organization created.");
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
      payload: { name: string };
    }) => adminApi.updateOrganization(id, payload),
    onSuccess: () => {
      toast.success("Organization updated.");
      setDialogOpen(false);
      setEditTarget(null);
      return invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteOrganization,
    onSuccess: () => {
      toast.success("Organization deleted.");
      return invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Couldn't delete the organization.")),
  });

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };
  const openEdit = (organization: Organization) => {
    setEditTarget(organization);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (values: OrganizationFormValues) => {
    if (editTarget) {
      await updateMutation.mutateAsync({ id: editTarget.id, payload: values });
    } else {
      await createMutation.mutateAsync(values);
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

  const columns = useMemo<DataTableColumn<Organization>[]>(
    () => [
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            actions={[
              {
                label: "LLM configs",
                icon: SlidersHorizontal,
                onSelect: () =>
                  router.push(`/admin/organizations/${row.original.id}/llm-configs`),
                testId: "row-llm-configs",
              },
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
        id: "institutes",
        header: "Institutes",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 cursor-pointer text-[#0C356A] hover:text-[#0C356A] hover:bg-[#0C356A]/8"
            onClick={() => router.push(`/admin/institutes?organizationId=${row.original.id}`)}
            data-testid="row-institutes"
          >
            View
          </Button>
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
    [router],
  );

  const hasFilters = Boolean(list.q || Object.keys(list.filters).length > 0);
  const clearFilters = () => {
    list.setSearch("");
    for (const key of Object.keys(list.filters)) list.setFilter(key, undefined);
  };

  const meta = organizationsQuery.data?.meta;

  // ---- Non-super access panel (never call /organizations as a lesser role) --
  if (!isSuper) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-16 text-center"
        data-testid="admin-access-denied"
      >
        <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <ShieldOff className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">
            Organizations are managed by Super Admins
          </p>
          <p className="text-xs text-slate-500">
            Your role doesn&apos;t include organization and LLM configuration access.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="size-3.5" />
          Back to overview
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="admin-organizations">
      <AdminPageHeader
        title="Organizations"
        description="Top-level tenants that group institutes and own the LLM credentials."
        actions={
          <Button type="button" onClick={openCreate} data-testid="create-organization">
            <Plus className="size-4" />
            Add organization
          </Button>
        }
      />

      <DataTable<Organization>
        columns={columns}
        data={organizationsQuery.data?.data ?? EMPTY_ROWS}
        page={list.page}
        pageSize={list.pageSize}
        total={meta?.total ?? 0}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        sortableColumnIds={SORTABLE_COLUMNS}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        isLoading={!organizationsQuery.data}
        isFetching={organizationsQuery.isFetching}
        error={
          organizationsQuery.isError && !organizationsQuery.data
            ? organizationsQuery.error
            : undefined
        }
        onRetry={() => organizationsQuery.refetch()}
        emptyTitle={hasFilters ? "No matching organizations" : "No organizations yet"}
        emptyDescription={
          hasFilters
            ? "Try a different search."
            : "Create an organization to start grouping institutes."
        }
        emptyAction={
          hasFilters ? (
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="size-3.5" />
              Add organization
            </Button>
          )
        }
        toolbar={
          <SearchInput
            value={list.search}
            onChange={list.setSearch}
            placeholder="Search organizations..."
            testId="organizations-search"
          />
        }
      />

      <OrganizationDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditTarget(null);
        }}
        organization={editTarget}
        onSubmit={handleDialogSubmit}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.id);
        }}
        title="Delete organization"
        itemName={deleteTarget?.name}
        description={
          <>
            Deleting{" "}
            <span className="font-bold text-slate-800">{deleteTarget?.name}</span>{" "}
            also removes its LLM configuration. Institutes under it keep their
            data but lose their organization link.
          </>
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default function OrganizationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <span
            role="status"
            aria-label="Loading organizations"
            className="inline-block w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"
          />
        </div>
      }
    >
      <OrganizationsContent />
    </Suspense>
  );
}
