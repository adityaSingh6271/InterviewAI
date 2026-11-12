"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useJobInterview } from "@/lib/hooks/useJobInterview";
import { useAuth } from "@/app/components/providers/AuthProvider";
import JobInterviewWorkspace from "@/app/components/dashboard/job-interviews/JobInterviewWorkspace";
import { Loader2, AlertCircle } from "lucide-react";
import IconButton from "@/components/common/icon-button";

interface WorkspacePageProps {
  params?: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default function JobInterviewWorkspacePage(props: WorkspacePageProps = {}) {
  const unwrappedParams = props.params ? React.use(props.params) : undefined;
  if (props.searchParams) {
    React.use(props.searchParams);
  }
  const hookParams = useParams();
  const router = useRouter();
  const id = unwrappedParams?.id ?? (hookParams?.id as string);
  const { user } = useAuth();

  const {
    interview,
    loading,
    updateInterview,
    deleteInterview,
    addNote,
    deleteNote,
  } = useJobInterview(id);

  // Role-aware UI: admin can manage any interview; student can edit their own
  // draft and delete any visible interview in their institute.
  const isOwnerStudent =
    user?.portal === "student" &&
    Boolean(interview?.createdBy && user?.id && interview.createdBy === user.id);

  const canManage =
    user?.portal === "admin" ||
    (isOwnerStudent && interview?.status === "draft");

  const canDelete = user?.portal === "admin" || user?.portal === "student";

  const handleDeleteInterview = async () => {
    try {
      await deleteInterview();
      router.push("/dashboard/interviews");
    } catch {
      // toast emitted by hook
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="size-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500">Loading interview workspace...</p>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center bg-white dark:bg-[#1E1E2D] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <AlertCircle className="size-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Job Interview Not Found
        </h2>
        <p className="text-xs text-slate-500">
          The requested interview workspace could not be found or may have been deleted.
        </p>
        <IconButton
          onClick={() => router.push("/dashboard/interviews")}
          label="Return to Interviews"
          variant="default"
          className="mx-auto text-xs"
        />
      </div>
    );
  }

  return (
    <JobInterviewWorkspace
      interview={interview}
      canManage={canManage}
      canDelete={canDelete}
      onUpdateInterview={updateInterview}
      onDeleteInterview={handleDeleteInterview}
      onAddNote={addNote}
      onDeleteNote={deleteNote}
    />
  );
}
