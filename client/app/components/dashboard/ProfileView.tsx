"use client";

import React, { useState, useMemo } from "react";
import {
  Mail,
  Building2,
  Tag,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import IconButton from "@/components/common/icon-button";
import DeleteConfirmationModal from "@/components/common/delete-confirmation-modal";
import { useAuth } from "../providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { adminRoleLabel } from "@/lib/adminRole";
import { useJobInterviews } from "@/lib/hooks/useJobInterviews";

export default function ProfileView() {
  const { user: authUser } = useAuth();

  // Fetch /auth/me explicitly with initial fallback to authUser from AuthProvider
  const { data: meData, isLoading } = useQuery({
    queryKey: ["auth", "currentUser"],
    queryFn: () => authApi.me(),
    initialData: authUser ? { user: authUser } : undefined,
  });

  const user = meData?.user ?? authUser;
  const { interviews } = useJobInterviews();

  // Extract parsed skills from user's interviews if any
  const extractedSkills = useMemo(() => {
    if (!interviews || interviews.length === 0) return [];
    const set = new Set<string>();
    for (const interview of interviews) {
      if (interview.matchAnalysis?.matchedSkills) {
        interview.matchAnalysis.matchedSkills.forEach((s) => set.add(s));
      }
    }
    return Array.from(set);
  }, [interviews]);

  const [addedSkills, setAddedSkills] = useState<string[]>([]);
  const [removedSkills, setRemovedSkills] = useState<string[]>([]);

  const skills = useMemo(() => {
    const removed = new Set(removedSkills);
    return Array.from(new Set([...extractedSkills, ...addedSkills])).filter(
      (s) => !removed.has(s),
    );
  }, [extractedSkills, addedSkills, removedSkills]);

  const [newSkill, setNewSkill] = useState("");
  const [skillToDelete, setSkillToDelete] = useState<string | null>(null);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setRemovedSkills((prev) => prev.filter((s) => s !== trimmed));
      setAddedSkills((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      toast.success(`Skill "${trimmed}" added to profile`);
      setNewSkill("");
    } else if (skills.includes(trimmed)) {
      toast(`"${trimmed}" is already in your skills list`);
    }
  };

  const handleConfirmRemoveSkill = () => {
    if (skillToDelete) {
      setRemovedSkills((prev) =>
        prev.includes(skillToDelete) ? prev : [...prev, skillToDelete],
      );
      setAddedSkills((prev) => prev.filter((s) => s !== skillToDelete));
      toast.success(`Removed "${skillToDelete}" from skills`);
      setSkillToDelete(null);
    }
  };

  // Derive dynamic user details from /auth/me
  const displayName = user?.name || "Candidate";
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || "C";

  const roleBadgeLabel = useMemo(() => {
    if (user?.portal === "student") return "Student Candidate";
    if (user?.adminRole) return adminRoleLabel(user.adminRole);
    if (user?.portal) {
      return `${user.portal.charAt(0).toUpperCase() + user.portal.slice(1)} Candidate`;
    }
    return "Candidate";
  }, [user]);

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return null;
    return new Date(user.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [user]);

  // Derive dynamic readiness score from user's interviews if available
  const readinessScore = useMemo(() => {
    if (!interviews || interviews.length === 0) return " — ";
    const scores = interviews
      .map((i) => i.matchAnalysis?.overallScore)
      .filter((s): s is number => typeof s === "number" && s > 0);
    if (scores.length === 0) return " — ";
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return `${avg}.0%`;
  }, [interviews]);

  // Derive target companies from interviews
  const targetCompanies = useMemo(() => {
    if (interviews && interviews.length > 0) {
      return interviews.slice(0, 4).map((i) => ({
        name: i.company || "Target Company",
        level: i.targetRole || "Role Assessment",
        status: i.matchAnalysis?.overallScore
          ? `Calibrated (${i.matchAnalysis.overallScore}%)`
          : i.status === "completed"
            ? "Completed"
            : "Ready",
      }));
    }
    return [];
  }, [interviews]);

  if (isLoading && !user) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-md" />
        <div className="h-32 bg-slate-100 rounded-xl border border-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="h-64 bg-slate-100 rounded-xl border border-slate-200" />
          <div className="h-64 bg-slate-100 rounded-xl border border-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-[26px] md:text-[28px] font-semibold text-slate-900 tracking-tight leading-tight">
          Candidate Profile & Resume Extraction
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-normal mt-0.5">
          Review your calibrated track, parsed resume assets, and target hiring
          bars.
        </p>
      </div>

      {/* Main Profile Hero Card */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs hover:border-[#0C356A]/40 transition-all duration-200 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#0C356A] flex items-center justify-center text-white text-xl sm:text-2xl font-semibold shadow-xs shrink-0">
            {displayInitial}
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                {displayName}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#0C356A]/10 text-[#0C356A] text-[11px] font-medium border border-[#0C356A]/20">
                {roleBadgeLabel}
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-slate-600 mt-1 font-normal">
              {user?.portal === "student"
                ? "Student Track · Assessment & Interview Readiness"
                : "Administrator · Platform Evaluator Track"}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 mt-2.5 font-normal">
              {user?.email && (
                <span
                  className="inline-flex items-center gap-1.5"
                  title={user.email}
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{user.email}</span>
                </span>
              )}
              {memberSince && (
                <span
                  className="inline-flex items-center gap-1.5"
                  title={`Registered on ${memberSince}`}
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Joined {memberSince}</span>
                </span>
              )}
              {/* {user?.instituteId && (
                <span
                  className="inline-flex items-center gap-1.5 max-w-55 truncate"
                  title={`Institute ID: ${user.instituteId}`}
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Inst: {user.instituteId.slice(0, 8)}...</span>
                </span>
              )} */}
              {/* <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Active Account</span>
              </span> */}
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 rounded-xl p-3.5 sm:p-4 border border-emerald-200 text-center shrink-0 min-w-36 w-full sm:w-auto">
          <div className="text-xl sm:text-2xl font-semibold text-emerald-700">
            {readinessScore}
          </div>
          <div className="text-[11px] font-medium text-emerald-800 mt-0.5">
            Readiness Index
          </div>
          <span className="text-[10px] text-emerald-600 block mt-0.5 font-normal">
            {interviews.length > 0 ? `${interviews.length} Interview${interviews.length === 1 ? "" : "s"}` : "No interviews yet"}
          </span>
        </div>
      </div>

      {/* Account Details & Metadata Card */}
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xs hover:border-[#0C356A]/40 transition-all duration-200">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0C356A]" />
            <h4 className="text-[14px] sm:text-[15px] font-semibold text-slate-900">
              Account & Credentials
            </h4>
          </div>
          <span className="text-[11px] text-[#0C356A] font-medium bg-[#0C356A]/10 border border-[#0C356A]/20 px-2 py-0.5 rounded-full">
            API Synced: /auth/me
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              Candidate ID
            </div>
            <div
              className="text-xs font-mono font-medium text-slate-900 mt-1 truncate"
              title={user?.id}
            >
              {user?.id || "—"}
            </div>
          </div> */}

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              Access Portal
            </div>
            <div className="text-xs font-medium text-slate-900 mt-1 capitalize flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {user?.portal || "Student"}
            </div>
          </div>

          {/* <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              Institute ID
            </div>
            <div
              className="text-xs font-mono font-medium text-slate-900 mt-1 truncate"
              title={user?.instituteId}
            >
              {user?.instituteId || "—"}
            </div>
          </div> */}

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              Registered Email
            </div>
            <div
              className="text-xs font-medium text-slate-900 mt-1 truncate"
              title={user?.email}
            >
              {user?.email || "—"}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              Account Created
            </div>
            <div className="text-xs font-medium text-slate-900 mt-1">
              {memberSince || "—"}
            </div>
          </div>

          {/* <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
            <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              Last Profile Sync
            </div>
            <div className="text-xs font-medium text-slate-900 mt-1">
              {lastUpdated || "—"}
            </div>
          </div> */}
        </div>
      </div>

      {/* Target Companies & Track Calibration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xs hover:border-[#0C356A]/40 transition-all duration-200">
          <div className="flex items-center gap-2 mb-1.5">
            <Building2 className="w-4 h-4 text-[#0C356A]" />
            <h4 className="text-[14px] sm:text-[15px] font-semibold text-slate-900">
              Target Companies & Roles
            </h4>
          </div>
          <p className="text-[11px] sm:text-[12px] text-slate-500 font-normal mb-3.5">
            AI interview rubrics calibrated for your engineering sessions:
          </p>
          {targetCompanies.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              No target companies or job roles added yet —
            </div>
          ) : (
            <div className="space-y-2">
              {targetCompanies.map((co, i) => (
                <div
                  key={i}
                  className="p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs hover:border-slate-300 transition-colors shadow-2xs"
                >
                  <div>
                    <div className="font-medium text-slate-900 text-[12.5px] sm:text-[13px]">
                      {co.name}
                    </div>
                    <div className="text-slate-500 font-normal text-[11px] mt-0.5">
                      {co.level}
                    </div>
                  </div>
                  <span className="font-medium text-[#0C356A] text-[11.5px]">
                    {co.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Smart Resume Extracted Skills & Tags */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xs hover:border-[#0C356A]/40 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#0C356A]" />
                <h4 className="text-[14px] sm:text-[15px] font-semibold text-slate-900">
                  Parsed Skills & Topics
                </h4>
              </div>
              <span className="text-[11px] text-[#0C356A] font-medium bg-[#0C356A]/10 px-2 py-0.5 rounded-full border border-[#0C356A]/20">
                Resume Synced
              </span>
            </div>
            <p className="text-[11px] sm:text-[12px] text-slate-500 font-normal mb-3.5">
              Skills automatically detected and targeted in your mock sessions:
            </p>

            {skills.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                No parsed skills detected yet — add your key skills or upload a resume to calibrate your profile —
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-normal transition-colors border border-slate-200/70"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => setSkillToDelete(skill)}
                      className="text-slate-400 hover:text-red-600 font-normal ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={handleAddSkill}
            className="mt-5 pt-4 border-t border-slate-200 flex gap-2.5"
          >
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add skill or technology..."
              className="flex-1 px-3.5 py-2 text-xs sm:text-[13px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0C356A]/20 focus:border-[#0C356A]"
            />
            <IconButton type="submit" action="add" label="Add" size="default" />
          </form>
        </div>
      </div>

      {/* Delete Skill Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(skillToDelete)}
        onClose={() => setSkillToDelete(null)}
        onConfirm={handleConfirmRemoveSkill}
        title="Remove Skill?"
        itemName={skillToDelete || undefined}
        description={
          skillToDelete ? (
            <>
              Are you sure you want to remove{" "}
              <span className="font-bold text-slate-900">
                &ldquo;{skillToDelete}&rdquo;
              </span>{" "}
              from your tracked skills?
            </>
          ) : undefined
        }
      />
    </div>
  );
}
