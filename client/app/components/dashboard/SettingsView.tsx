"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema, SettingsFormData } from "../../lib/validations";
import { CheckCircle2, X, User } from "lucide-react";
import toast from "react-hot-toast";
import IconButton from "@/components/common/icon-button";
import { useAuth } from "../providers/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { adminApi } from "@/lib/api/admin";
import { queryKeys } from "@/lib/api/queryKeys";
import { getErrorMessage } from "@/lib/api/errors";
import { useJobInterviews } from "@/lib/hooks/useJobInterviews";

export default function SettingsView() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const { interviews } = useJobInterviews();

  // Fetch /auth/me explicitly with initial fallback to authUser from AuthProvider
  const { data: meData, isLoading } = useQuery({
    queryKey: ["auth", "currentUser"],
    queryFn: () => authApi.me(),
    initialData: authUser ? { user: authUser } : undefined,
  });

  const user = meData?.user ?? authUser;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      displayName: user?.name || "",
      email: user?.email || "",
      targetSeniority: interviews?.[0]?.targetRole || "",
    },
    mode: "onTouched",
  });

  // Re-populate form once real user data or interviews arrive
  useEffect(() => {
    if (user) {
      let saved: Partial<SettingsFormData> = {};
      try {
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem(`settings_preferences_${user.id}`)
            : null;
        if (stored) saved = JSON.parse(stored);
      } catch {
        // ignore parse error
      }

      reset({
        displayName: user.name || "",
        email: user.email || "",
        targetSeniority:
          saved.targetSeniority ||
          interviews?.[0]?.targetRole ||
          "",
      });
    }
  }, [user, interviews, reset]);

  const onSaveSettings = async (data: SettingsFormData) => {
    try {
      if (user?.id) {
        const payload: { name?: string; email?: string } = {};
        if (data.displayName !== user.name) {
          payload.name = data.displayName;
        }
        if (data.email !== user.email) {
          payload.email = data.email;
        }

        // Only fire profile update if identity fields were modified
        if (Object.keys(payload).length > 0) {
          if (user.portal === "student") {
            await adminApi.updateStudent(user.id, payload);
          } else if (user.portal === "admin") {
            await adminApi.updateAdmin(user.id, payload);
          }
        }
      }

      if (typeof window !== "undefined" && user?.id) {
        localStorage.setItem(
          `settings_preferences_${user.id}`,
          JSON.stringify({
            targetSeniority: data.targetSeniority ?? "",
          }),
        );
      }

      // Invalidate auth cache so the new name/email updates across topbar & profile
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      await queryClient.invalidateQueries({
        queryKey: ["auth", "currentUser"],
      });

      setSaveSuccess(true);
      toast.success("Account settings saved successfully!");
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      toast.error(
        getErrorMessage(err, "Failed to save settings. Please try again."),
      );
    }
  };

  if (isLoading && !user) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-72 bg-slate-100 rounded-xl border border-slate-200" />
          <div className="h-72 bg-slate-100 rounded-xl border border-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-[26px] md:text-[28px] font-semibold text-slate-900 tracking-tight leading-tight">
          Account &amp; Profile Settings
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-normal mt-0.5">
          Manage your display name, account email, and target role profile.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-[13px] font-medium flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Your account settings have been saved.</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccess(false)}
            className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSaveSettings)}
        className="max-w-2xl space-y-5"
        noValidate
      >
        {/* Candidate Identity Card */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xs hover:border-[#0C356A]/40 transition-all duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7.5 h-7.5 rounded-lg bg-[#0C356A]/10 text-[#0C356A] flex items-center justify-center font-semibold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[14px] sm:text-[15px] font-semibold text-slate-900">
                    Candidate Identity
                  </h3>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Personal information and seniority level
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-[#0C356A] font-medium bg-[#0C356A]/10 border border-[#0C356A]/20 px-2 py-0.5 rounded-full capitalize">
                {user?.portal || "Student"} Portal
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  maxLength={50}
                  autoComplete="name"
                  placeholder="Enter your full name"
                  {...register("displayName")}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-[13.5px] focus:outline-none focus:ring-2 ${
                    errors.displayName
                      ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                      : "border-slate-200 bg-white focus:border-[#0C356A] focus:ring-[#0C356A]/20"
                  }`}
                />
                {errors.displayName && (
                  <p className="text-red-600 text-xs font-medium mt-1">
                    {errors.displayName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  maxLength={100}
                  autoComplete="email"
                  placeholder="name@example.com"
                  {...register("email")}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-[13.5px] focus:outline-none focus:ring-2 ${
                    errors.email
                      ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                      : "border-slate-200 bg-white focus:border-[#0C356A] focus:ring-[#0C356A]/20"
                  }`}
                />
                {errors.email && (
                  <p className="text-red-600 text-xs font-medium mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Seniority Bar
                </label>
                <input
                  type="text"
                  maxLength={80}
                  placeholder="e.g. Software Engineer, Tech Lead"
                  {...register("targetSeniority")}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-[13.5px] focus:outline-none focus:ring-2 ${
                    errors.targetSeniority
                      ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                      : "border-slate-200 bg-white focus:border-[#0C356A] focus:ring-[#0C356A]/20"
                  }`}
                />
                {errors.targetSeniority && (
                  <p className="text-red-600 text-xs font-medium mt-1">
                    {errors.targetSeniority.message}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row justify-end">
              <IconButton
                type="submit"
                action="save"
                label="Save Changes"
                isLoading={isSubmitting}
                loadingText="Saving..."
                className="w-full sm:w-auto justify-center"
              />
            </div>
          </div>
      </form>
    </div>
  );
}
