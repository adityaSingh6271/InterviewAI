"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/app/components/providers/AuthProvider";
import {
  studentApplicationsApi,
  type CreateApplicationPayload,
} from "@/lib/api/studentApplications";
import { queryKeys } from "@/lib/api/queryKeys";
import { getErrorMessage } from "@/lib/api/errors";
import type { ServerStudentApplication } from "@/lib/api/admin";

export function useStudentApplications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isStudent = user?.portal === "student";
  const studentId = user?.id ?? "";

  const applicationsQuery = useQuery({
    queryKey: queryKeys.applications.my(studentId),
    queryFn: async () => {
      if (!studentId) return [];
      const res = await studentApplicationsApi.listByStudent(studentId, { limit: 100 });
      return res.data;
    },
    enabled: Boolean(studentId && isStudent),
    staleTime: 30_000,
  });

  const applications = useMemo<ServerStudentApplication[]>(
    () => applicationsQuery.data ?? [],
    [applicationsQuery.data],
  );

  const applicationsByInterview = useMemo<Map<string, ServerStudentApplication>>(() => {
    const map = new Map<string, ServerStudentApplication>();
    for (const app of applications) {
      map.set(app.interviewId, app);
    }
    return map;
  }, [applications]);

  const hasApplied = (interviewId: string): boolean => {
    return applicationsByInterview.has(interviewId);
  };

  const getApplication = (interviewId: string): ServerStudentApplication | undefined => {
    return applicationsByInterview.get(interviewId);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.applications.my(studentId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all });
  };

  const applyMutation = useMutation({
    mutationFn: (payload: CreateApplicationPayload) =>
      studentApplicationsApi.apply(payload),
    onSuccess: () => {
      toast.success("Application submitted successfully!");
      invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to submit application."));
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (applicationId: string) =>
      studentApplicationsApi.withdraw(applicationId),
    onSuccess: () => {
      toast.success("Application withdrawn.");
      invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to withdraw application."));
    },
  });

  return {
    applications,
    loading: applicationsQuery.isLoading,
    hasApplied,
    getApplication,
    apply: applyMutation.mutateAsync,
    isApplying: applyMutation.isPending,
    withdraw: withdrawMutation.mutateAsync,
    isWithdrawing: withdrawMutation.isPending,
    refetch: applicationsQuery.refetch,
  };
}
