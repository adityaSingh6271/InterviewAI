"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bot, Sparkles, AlertCircle } from "lucide-react";

import { useAuth } from "../providers/AuthProvider";
import { adminApi, type LlmConfig } from "@/lib/api/admin";
import { adminRoleRank } from "@/lib/adminRole";
import { queryKeys } from "@/lib/api/queryKeys";

/**
 * Read-only AI Engine Status badge for Admin Console header.
 * - For SUPER_ADMIN: Checks active LLM config across the organization and shows provider/model.
 * - For INSTITUTE_ADMIN / ORG_ADMIN: Shows an institutional AI status indicator reassuring that AI evaluation is connected.
 */
export default function AiStatusBadge() {
  const { user } = useAuth();
  const isSuper = adminRoleRank(user?.adminRole) >= 3;

  // Super Admin: resolve organization to query active LLM config
  const orgQuery = useQuery({
    queryKey: queryKeys.admin.list("organizations", { limit: 1 }),
    queryFn: () => adminApi.listOrganizations({ limit: 1 }),
    enabled: isSuper,
    staleTime: 60_000,
  });

  const firstOrgId = orgQuery.data?.data?.[0]?.id;

  const llmQuery = useQuery({
    queryKey: queryKeys.admin.list("llm-configs", {
      organizationId: firstOrgId ?? "",
    }),
    queryFn: () => adminApi.listLlmConfigs(firstOrgId!),
    enabled: isSuper && Boolean(firstOrgId),
    staleTime: 60_000,
  });

  const activeConfig: LlmConfig | undefined = llmQuery.data?.data?.find(
    (cfg) => cfg.isActive,
  );

  // If SUPER_ADMIN with active config
  if (isSuper) {
    if (llmQuery.isLoading || orgQuery.isLoading) {
      return (
        <div
          data-testid="ai-status-loading"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[11.5px] font-medium"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
          <span>AI Engine: Checking...</span>
        </div>
      );
    }

    if (activeConfig) {
      return (
        <Link
          href={
            firstOrgId
              ? `/admin/organizations/${firstOrgId}/llm-configs`
              : "/admin/organizations"
          }
          title={`Active AI Provider: ${activeConfig.provider} | Model: ${activeConfig.modelName}`}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[11.5px] font-medium hover:bg-emerald-100/70 transition-colors cursor-pointer"
          data-testid="ai-status-active"
        >
          {/* <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span> */}
          <Bot className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold capitalize">
            {activeConfig.provider}:
          </span>
          <span className="text-emerald-700 truncate max-w-27.5">
            {activeConfig.modelName}
          </span>
        </Link>
      );
    }

    return (
      <Link
        href={
          firstOrgId
            ? `/admin/organizations/${firstOrgId}/llm-configs`
            : "/admin/organizations"
        }
        title="No active LLM config set for organization interviews."
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 text-[11.5px] font-medium hover:bg-amber-100/70 transition-colors cursor-pointer"
        data-testid="ai-status-warning"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
        <span>AI: Config Needed</span>
      </Link>
    );
  }

  // Institute Admin or Organization Admin read-only status indicator
  return (
    <></>


  );
}
