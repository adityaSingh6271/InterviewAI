"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  ADMIN_ROLES,
  adminApi,
  type AdminAccount,
  type AdminRole,
  type AdminListParams,
} from "@/lib/api/admin";
import { queryKeys } from "@/lib/api/queryKeys";
import { getErrorMessage } from "@/lib/api/errors";
import type { User } from "@/lib/api/types";
import {
  adminRoleLabel,
  adminRoleRank,
  ADMIN_ROLE_LABELS,
} from "@/lib/adminRole";
import type { AdminAccountFormValues } from "@/lib/validations/adminValidations";
import { useAdminListState } from "@/lib/hooks/useAdminListState";
import { useAuth } from "../../components/providers/AuthProvider";
import AdminPageHeader from "@/components/common/admin-page-header";
import SearchInput from "@/components/common/search-input";
import RowActions from "@/components/common/row-actions";
import { StatusBadge, roleBadgeVariant } from "@/components/common/status-badge";
import {
  DataTable,
  EMPTY_ROWS,
  type DataTableColumn,
} from "@/components/common/data-table";
import DeleteConfirmationModal from "@/components/common/delete-confirmation-modal";
import AdminAccountDialog from "../../components/admin/AdminAccountDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Admin accounts list (Phase 2): server-paginated table over GET /admins
 * with search (name/email), role filter, sortable columns, and rank-aware
 * create/edit/delete. URL-synced list state lives in useAdminListState.
 */

const SORTABLE_COLUMNS = ["name", "email", "role", "createdAt"];
const LOOKUP_PARAMS = { page: 1, limit: 100 };

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function AdminAccountsContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const list = useAdminListState({ defaultSort: "createdAt" });

  const currentUserId = user?.id ?? "";
  const myRank = adminRoleRank(user?.adminRole);
  const assignableRoles = ADMIN_ROLES.filter(
    (role) => adminRoleRank(role) <= myRank,
  );
  const showInstituteField = myRank >= 2;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminAccount | null>(null);

  const roleFilter = list.filters.role ?? "";
  const params = useMemo<AdminListParams>(
    () => ({
      ...list.listParams,
      sort: list.listParams.sort as AdminListParams["sort"],
      ...(roleFilter ? { role: roleFilter as AdminRole } : {}),
    }),
    [list.listParams, roleFilter],
  );

  const accountsQuery = useQuery({
    queryKey: queryKeys.admin.list("admins", params),
    queryFn: () => adminApi.listAdmins(params),
    placeholderData: keepPreviousData,
  });

  // Institute names for the table column + the dialog's select options.
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

  // ---- Mutations (create / edit / delete) ---------------------------------

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });

  const createMutation = useMutation({
    mutationFn: adminApi.createAdmin,
    onSuccess: () => {
      toast.success("Admin account created.");
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
      payload: Parameters<typeof adminApi.updateAdmin>[1];
    }) => adminApi.updateAdmin(id, payload),
    onSuccess: () => {
      toast.success("Admin account updated.");
      setDialogOpen(false);
      setEditTarget(null);
      return invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteAdmin,
    onSuccess: () => {
      toast.success("Admin account deleted.");
      return invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Couldn't delete the admin account.")),
  });

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };
  const openEdit = (account: AdminAccount) => {
    setEditTarget(account);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (values: AdminAccountFormValues) => {
    if (editTarget) {
      const isSelf = editTarget.id === currentUserId;
      await updateMutation.mutateAsync({
        id: editTarget.id,
        payload: {
          name: values.name.trim(),
          email: values.email.trim(),
          ...(values.password ? { password: values.password } : {}),
          // The server forbids self role changes - never send it for self.
          ...(isSelf ? {} : { role: values.role }),
          ...(showInstituteField && values.instituteId
            ? { instituteId: values.instituteId }
            : {}),
        },
      });
    } else {
      await createMutation.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password ?? "",
        role: values.role,
        ...(showInstituteField && values.instituteId
          ? { instituteId: values.instituteId }
          : {}),
      });
    }
  };

  // ---- Table --------------------------------------------------------------

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

  const columns = useMemo<DataTableColumn<User>[]>(() => {
    const canEdit = (account: AdminAccount) =>
      myRank >= adminRoleRank(account.adminRole);
    const canDelete = (account: AdminAccount) =>
      account.id !== currentUserId && myRank >= adminRoleRank(account.adminRole);

    return [
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
                disabled: !canEdit(row.original),
                testId: "row-edit",
              },
              {
                label: "Delete",
                icon: Trash2,
                destructive: true,
                onSelect: () => setDeleteTarget(row.original),
                disabled: !canDelete(row.original),
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
        id: "role",
        accessorKey: "adminRole",
        header: "Role",
        cell: ({ row }) => (
          <StatusBadge
            variant={roleBadgeVariant(row.original.adminRole)}
            testId="row-role"
          >
            {adminRoleLabel(row.original.adminRole)}
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
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-slate-500">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ];
  }, [instituteLabel, myRank, currentUserId]);

  const hasFilters = Boolean(list.q || Object.keys(list.filters).length > 0);
  const clearFilters = () => {
    list.setSearch("");
    for (const key of Object.keys(list.filters)) list.setFilter(key, undefined);
  };

  const meta = accountsQuery.data?.meta;

  return (
    <div className="space-y-5" data-testid="admin-accounts">
      <AdminPageHeader
        title="Admin accounts"
        description="Provision administrators and manage who can access which scope."
        actions={
          <Button
            type="button"
            onClick={openCreate}
            disabled={!assignableRoles.length}
            data-testid="create-admin"
          >
            <Plus className="size-4" />
            Add admin
          </Button>
        }
      />

      <DataTable<User>
        columns={columns}
        data={accountsQuery.data?.data ?? EMPTY_ROWS}
        page={list.page}
        pageSize={list.pageSize}
        total={meta?.total ?? 0}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        sortableColumnIds={SORTABLE_COLUMNS}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        isLoading={!accountsQuery.data}
        isFetching={accountsQuery.isFetching}
        error={accountsQuery.isError && !accountsQuery.data ? accountsQuery.error : undefined}
        onRetry={() => accountsQuery.refetch()}
        emptyTitle={hasFilters ? "No matching admin accounts" : "No admin accounts yet"}
        emptyDescription={
          hasFilters
            ? "Try a different search or role filter."
            : "Provision the first administrator to get your team onboard."
        }
        emptyAction={
          hasFilters ? (
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="size-3.5" />
              Add admin
            </Button>
          )
        }
        toolbar={
          <>
            <SearchInput
              value={list.search}
              onChange={list.setSearch}
              placeholder="Search name or email..."
              testId="admins-search"
            />
            <Select
              value={roleFilter || "all"}
              onValueChange={(value) =>
                list.setFilter("role", value === "all" ? undefined : value)
              }
            >
              <SelectTrigger
                size="sm"
                className="w-44"
                aria-label="Filter by role"
                data-testid="admins-role-filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {assignableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ADMIN_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <AdminAccountDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditTarget(null);
        }}
        account={editTarget}
        assignableRoles={assignableRoles}
        institutes={institutes}
        showInstituteField={showInstituteField}
        currentUserId={currentUserId}
        onSubmit={handleDialogSubmit}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.id);
        }}
        title="Delete admin account"
        itemName={deleteTarget?.name}
        description={
          <>
            This permanently removes{" "}
            <span className="font-bold text-slate-800">{deleteTarget?.name}</span>
            &apos;s admin access. Their sessions are revoked immediately.
          </>
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default function AdminAccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <span
            role="status"
            aria-label="Loading admin accounts"
            className="inline-block w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"
          />
        </div>
      }
    >
      <AdminAccountsContent />
    </Suspense>
  );
}
