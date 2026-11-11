"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/api/errors";
import { attemptsApi } from "@/lib/api/attempts";
import { interviewsApi } from "@/lib/api/interviews";
import { queryKeys } from "@/lib/api/queryKeys";
import { toJobInterview, toUpdatePayload } from "@/lib/mappers/interview.mapper";
import type { JobInterview } from "@/lib/types/jobInterview";

/**
 * Single interview workspace state (TanStack Query): the interview row and
 * its nested rounds/notes are fetched in parallel and combined into one
 * `JobInterview` view model. Mutations invalidate the interview keys so the
 * list screen and workspace stay consistent.
 */

/** Rows fetched per interview - above the server's max limit of 100. */
const NESTED_LIMIT = 100;

export function useJobInterview(id: string) {
  const queryClient = useQueryClient();
  const enabled = Boolean(id);

  const detailQuery = useQuery({
    queryKey: queryKeys.interviews.detail(id),
    queryFn: async () => (await interviewsApi.get(id)).data,
    enabled,
  });

  const roundsQuery = useQuery({
    queryKey: queryKeys.interviews.rounds(id),
    queryFn: async () => (await interviewsApi.listRounds(id, { limit: NESTED_LIMIT })).data,
    enabled,
  });

  const notesQuery = useQuery({
    queryKey: queryKeys.interviews.notes(id),
    queryFn: async () => (await interviewsApi.listNotes(id, { limit: NESTED_LIMIT })).data,
    enabled,
  });

  /** Attempts (student simulation flow): students see only their own rows. */
  const attemptsQuery = useQuery({
    queryKey: queryKeys.interviews.attempts(id),
    queryFn: async () => (await attemptsApi.listByInterview(id, { limit: NESTED_LIMIT })).data,
    enabled,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all });
  }, [queryClient]);

  const interview = useMemo<JobInterview | null>(() => {
    if (!detailQuery.data) return null;
    return toJobInterview(
      detailQuery.data,
      roundsQuery.data ?? [],
      notesQuery.data ?? [],
      attemptsQuery.data ?? [],
    );
  }, [detailQuery.data, roundsQuery.data, notesQuery.data, attemptsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<JobInterview>) =>
      interviewsApi.update(id, toUpdatePayload(updates)),
    onSuccess: () => {
      toast.success("Updated successfully.");
      invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update interview.")),
  });

  const createNoteMutation = useMutation({
    mutationFn: ({ content, roundId }: { content: string; roundId?: string }) =>
      interviewsApi.createNote(id, { content, roundId }),
    onSuccess: () => {
      toast.success("Note saved.");
      invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to add note.")),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => interviewsApi.removeNote(id, noteId),
    onSuccess: () => {
      toast.success("Note removed.");
      invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete note.")),
  });

  const deleteInterviewMutation = useMutation({
    mutationFn: () => interviewsApi.remove(id),
    onSuccess: () => {
      toast.success("Job interview deleted.");
      invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete interview.")),
  });

  const loading = enabled
    ? detailQuery.isPending ||
      roundsQuery.isPending ||
      notesQuery.isPending ||
      attemptsQuery.isPending
    : false;

  const refresh = useCallback(async () => {
    await Promise.all([
      detailQuery.refetch(),
      roundsQuery.refetch(),
      notesQuery.refetch(),
      attemptsQuery.refetch(),
    ]);
  }, [detailQuery, roundsQuery, notesQuery, attemptsQuery]);

  return {
    interview,
    loading,
    refresh,
    /** PATCH (Edit modal). Rejects on failure - the toast is emitted in onError. */
    updateInterview: async (updates: Partial<JobInterview>) => {
      await updateMutation.mutateAsync(updates);
    },
    /** Fire-and-forget from the notes UI: failures toast, never reject. */
    addNote: async (content: string, roundId?: string) => {
      try {
        await createNoteMutation.mutateAsync({ content, roundId });
      } catch {
        // toast emitted in onError
      }
    },
    deleteNote: async (noteId: string) => {
      try {
        await deleteNoteMutation.mutateAsync(noteId);
      } catch {
        // toast emitted in onError
      }
    },
    /** DELETE the current interview; throws only if caller needs to halt navigation. */
    deleteInterview: async () => {
      await deleteInterviewMutation.mutateAsync();
    },
  };
}
