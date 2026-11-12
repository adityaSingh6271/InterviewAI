"use client";

import React from "react";
import JobInterviewsManager from "@/app/components/dashboard/job-interviews/JobInterviewsManager";
import { useAuth } from "@/app/components/providers/AuthProvider";
import { useJobInterviews } from "@/lib/hooks/useJobInterviews";
import type { JobInterview } from "@/lib/types/jobInterview";

interface PageProps {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default function InterviewsPage(props: PageProps = {}) {
  if (props.params) React.use(props.params);
  if (props.searchParams) React.use(props.searchParams);
  const { user } = useAuth();
  const {
    interviews,
    filteredInterviews,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    deleteInterview,
    updateInterview,
    page,
    setPage,
    totalPages,
    total,
  } = useJobInterviews();

  // Role-aware UI: creating is open to both portals (the service pins
  // students to their own institute); admins manage all institute rows, while
  // students may edit their own drafts and delete any visible interview.
  const canManage = user?.portal === "admin";
  const canCreate = Boolean(user);
  const canEditItem = (item: JobInterview) =>
    canManage ||
    (user?.portal === "student" &&
      item.status === "draft" &&
      Boolean(item.createdBy && user?.id && item.createdBy === user.id));
  const canDeleteItem = () => canManage || user?.portal === "student";

  return (
    <div className="w-full">
      <JobInterviewsManager
        interviews={interviews}
        filteredInterviews={filteredInterviews}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        onDeleteInterview={deleteInterview}
        canManage={canManage}
        canEditItem={canEditItem}
        canDeleteItem={canDeleteItem}
        canCreate={canCreate}
        onUpdateInterview={updateInterview}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
