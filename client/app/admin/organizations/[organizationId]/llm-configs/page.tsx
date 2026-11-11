"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { SortingState } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { ArrowLeft, Pencil, Plus, ShieldOff, Trash2 } from "lucide-react";

import { adminApi, type LlmConfig, type LlmConfigListParams } from "@/lib/api/admin";
import { queryKeys } from "@/lib/api/queryKeys";
import { getErrorMessage } from "@/lib/api/errors";
import { adminRoleRank } from "@/lib/adminRole";
import type { LlmConfigFormValues } from "@/lib/validations/adminValidations";
import { useAdminListState } from "@/lib/hooks/useAdminListState";
import { useAuth } from "../../../../components/providers/AuthProvider";
import AdminPageHeader from "@/components/common/admin-page-header";
import RowActions from "@/components/common/row-actions";
import { StatusBadge } from "@/components/common/status-badge";
import {
  DataTable,
  EMPTY_ROWS,
  type DataTableColumn,
} from "@/components/common/data-table";
import DeleteConfirmationModal from "@/components/common/delete-confirmation-modal";
import LlmConfigDialog from "../../../../components/admin/LlmConfigDialog";
import { Button } from "@/components/ui/button";

/**
 * Organization LLM configurations (Phase 4, SUPER_ADMIN only): the provider
 * credentials behind AI rounds. The API key is write-only - create requires
 * one, edit treats blank as "keep current", reads never return it.
 *
 * No search/filter controls here: the endpoint's list query only supports
 * sort + pagination (showing a dead search box would lie to the operator).
 */

const SORTABLE_COLUMNS = ["provider", "modelName", "createdAt"];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function LlmConfigsContent() {
  const params = useParams<{ organizationId: string }>();
  const organizationId = params?.organizationId ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const list = useAdminListState({ defaultSort: "createdAt" });

  const isSuper = adminRoleRank(user?.adminRole) >= 3;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LlmConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LlmConfig | null>(null);

  const listParams = useMemo<LlmConfigListParams>(
    () => ({
      ...list.listParams,
      sort: list.listParams.sort as LlmConfigListParams["sort"],
    }),
    [list.listParams],
  );

  const organizationQuery = useQuery({
    queryKey: queryKeys.admin.detail("organizations", organizationId),
    queryFn: () => adminApi.getOrganization(organizationId),
    enabled: Boolean(organizationId) && isSuper,
    staleTime: 5 * 60_000,
  });

  const configsQuery = useQuery({
    queryKey: queryKeys.admin.list("llm-configs", { ...listParams, organizationId }),
    queryFn: () => adminApi.listLlmConfigs(organizationId, listParams),
    placeholderData: keepPreviousData,
    enabled: Boolean(organizationId) && isSuper,
  });

  // ---- Mutations -----------------------------------------------------------

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });

  const buildSettings = (values: LlmConfigFormValues) => {
    const settings: Record<string, unknown> = {};
    if (values.baseUrl?.trim()) settings.baseUrl = values.baseUrl.trim();
    if (typeof values.temperature === "number" && !isNaN(values.temperature)) {
      settings.temperature = values.temperature;
    }
    if (typeof values.maxTokens === "number" && !isNaN(values.maxTokens)) {
      settings.maxTokens = values.maxTokens;
    }
    return Object.keys(settings).length > 0 ? settings : null;
  };

  const createMutation = useMutation({
    mutationFn: (values: LlmConfigFormValues) =>
      adminApi.createLlmConfig(organizationId, {
        provider: values.provider.trim(),
        modelName: values.modelName.trim(),
        apiKey: values.apiKey ?? "",
        isActive: values.isActive,
        settings: buildSettings(values),
      }),
    onSuccess: () => {
      toast.success("LLM configuration created.");
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
      payload: Parameters<typeof adminApi.updateLlmConfig>[2];
    }) => adminApi.updateLlmConfig(organizationId, id, payload),
    onSuccess: () => {
      toast.success("LLM configuration updated.");
      setDialogOpen(false);
      setEditTarget(null);
      return invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (llmConfigId: string) => adminApi.deleteLlmConfig(organizationId, llmConfigId),
    onSuccess: () => {
      toast.success("LLM configuration deleted.");
      return invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Couldn't delete the configuration.")),
  });

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };
  const openEdit = (config: LlmConfig) => {
    setEditTarget(config);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (values: LlmConfigFormValues) => {
    if (editTarget) {
      const apiKey = values.apiKey?.trim() || undefined;
      await updateMutation.mutateAsync({
        id: editTarget.id,
        payload: {
          provider: values.provider.trim(),
          modelName: values.modelName.trim(),
          ...(apiKey ? { apiKey } : {}),
          isActive: values.isActive,
          settings: buildSettings(values),
        },
      });
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

  const columns = useMemo<DataTableColumn<LlmConfig>[]>(
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
        id: "provider",
        accessorKey: "provider",
        header: "Provider",
        cell: ({ row }) => (
          <span className="font-medium text-slate-900">{row.original.provider}</span>
        ),
      },
      {
        id: "modelName",
        accessorKey: "modelName",
        header: "Model",
        cell: ({ row }) => {
          const settings = (row.original.settings as Record<string, unknown> | null) ?? {};
          const baseUrl = typeof settings.baseUrl === "string" ? settings.baseUrl : undefined;
          return (
            <div>
              <span className="text-slate-700 font-medium">{row.original.modelName}</span>
              {baseUrl && (
                <div
                  className="text-[11px] text-slate-400 font-mono truncate max-w-45"
                  title={baseUrl}
                >
                  {baseUrl}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "settings",
        header: "Settings",
        enableSorting: false,
        cell: ({ row }) => {
          const settings = (row.original.settings as Record<string, unknown> | null) ?? {};
          if (Object.keys(settings).length === 0) {
            return <span className="text-slate-400 text-xs">Standard</span>;
          }
          return (
            <div className="flex flex-wrap gap-1 text-[11px] text-slate-600">
              {typeof settings.temperature === "number" && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px]">
                  temp: {settings.temperature}
                </span>
              )}
              {typeof settings.maxTokens === "number" && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px]">
                  max: {settings.maxTokens}
                </span>
              )}
              {typeof settings.baseUrl === "string" && Boolean(settings.baseUrl) && (
                <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-mono text-[10px]">
                  proxy
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge
            variant={row.original.isActive ? "success" : "secondary"}
            testId="row-status"
          >
            {row.original.isActive ? "Active" : "Inactive"}
          </StatusBadge>
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
    [],
  );

  const meta = configsQuery.data?.meta;
  const organizationName = organizationQuery.data?.data.name;

  // ---- Non-super access panel ----------------------------------------------
  if (!isSuper || !organizationId) {
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
            LLM configurations are managed by Super Admins
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
    <div className="space-y-5" data-testid="admin-llm-configs">
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-[#0C356A]"
        data-testid="back-to-organizations"
      >
        <ArrowLeft className="size-3.5" />
        Organizations
      </Link>

      <AdminPageHeader
        title="LLM configurations"
        description={
          organizationName
            ? `Provider credentials powering AI rounds for ${organizationName}.`
            : "Provider credentials powering AI rounds for this organization."
        }
        actions={
          <Button type="button" onClick={openCreate} data-testid="create-llm-config">
            <Plus className="size-4" />
            Add config
          </Button>
        }
      />

      <DataTable<LlmConfig>
        columns={columns}
        data={configsQuery.data?.data ?? EMPTY_ROWS}
        page={list.page}
        pageSize={list.pageSize}
        total={meta?.total ?? 0}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        sortableColumnIds={SORTABLE_COLUMNS}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        isLoading={!configsQuery.data}
        isFetching={configsQuery.isFetching}
        error={configsQuery.isError && !configsQuery.data ? configsQuery.error : undefined}
        onRetry={() => configsQuery.refetch()}
        emptyTitle="No LLM configurations yet"
        emptyDescription="Add the provider credentials your AI rounds should use."
        emptyAction={
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add config
          </Button>
        }
      />

      <LlmConfigDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditTarget(null);
        }}
        config={editTarget}
        onSubmit={handleDialogSubmit}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.id);
        }}
        title="Delete LLM configuration"
        itemName={deleteTarget ? `${deleteTarget.provider} · ${deleteTarget.modelName}` : undefined}
        description={
          <>
            AI rounds for this organization will stop working until another
            configuration is marked active.
          </>
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

interface LlmConfigsPageProps {
  params?: Promise<{ organizationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default function LlmConfigsPage(props: LlmConfigsPageProps = {}) {
  if (props.params) {
    React.use(props.params);
  }
  if (props.searchParams) {
    React.use(props.searchParams);
  }

  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <span
            role="status"
            aria-label="Loading LLM configurations"
            className="inline-block w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"
          />
        </div>
      }
    >
      <LlmConfigsContent />
    </Suspense>
  );
}
