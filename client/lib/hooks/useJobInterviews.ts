"use client";

import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/api/errors";
import { interviewsApi, type ServerInterviewStatus } from "@/lib/api/interviews";
import { queryKeys } from "@/lib/api/queryKeys";
import { toJobInterview, toUpdatePayload } from "@/lib/mappers/interview.mapper";
import type { JobInterview } from "@/lib/types/jobInterview";

/**
 * Interview list state (server-backed via TanStack Query).
 *
 * Search (`q`) and status are server-side filters (debounced/reset page to 1
 * on change); category stays a client-side refinement of the fetched page.
 * The return shape mirrors the old localStorage hook so pages/components
 * keep their contract - only the data source changed.
 */

const PAGE_SIZE = 20;

/** Debounce a value so typing doesn't fire a request per keystroke. */
function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useJobInterviews() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounced(searchTerm);

  const [prevFilterKey, setPrevFilterKey] = useState("");
  const currentFilterKey = `${debouncedSearch}|${statusFilter}`;
  if (prevFilterKey !== currentFilterKey) {
    setPrevFilterKey(currentFilterKey);
    if (page !== 1) {
      setPage(1);
    }
  }

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      q: debouncedSearch.trim() || undefined,
      status: statusFilter !== "all" ? (statusFilter as ServerInterviewStatus) : undefined,
    }),
    [page, debouncedSearch, statusFilter],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.interviews.list(params),
    queryFn: async () => {
      const { data, meta } = await interviewsApi.list(params);
      return { items: data.map((row) => toJobInterview(row)), meta };
    },
    placeholderData: keepPreviousData, // keep the previous page while refetching
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => interviewsApi.remove(id),
    onSuccess: () => {
      toast.success("Job interview deleted.");
      queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete interview.")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<JobInterview> }) =>
      interviewsApi.update(id, toUpdatePayload(updates)),
    onSuccess: () => {
      toast.success("Updated successfully.");
      queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update interview.")),
  });

  const interviews = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);
  const filteredInterviews =
    categoryFilter === "all"
      ? interviews
      : interviews.filter((item) => item.category === categoryFilter);

  return {
    interviews,
    filteredInterviews,
    loading: listQuery.isPending,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    /** Server-side pagination (page 1..totalPages, PAGE_SIZE per page). */
    page,
    setPage,
    totalPages: listQuery.data?.meta?.totalPages ?? 1,
    total: listQuery.data?.meta?.total ?? interviews.length,
    refresh: () => listQuery.refetch().then(() => undefined),
    deleteInterview: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
      } catch {
        // toast emitted in onError
      }
    },
    /** PATCH an interview from the list screen (Edit modal). Rejects on failure. */
    updateInterview: async (id: string, updates: Partial<JobInterview>) => {
      await updateMutation.mutateAsync({ id, updates });
    },
  };
}
