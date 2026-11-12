"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, SignupFormData } from "../lib/validations";
import { getAuthErrorMessage } from "../lib/authErrors";
import { useAuth } from "../components/providers/AuthProvider";
import { LogoIcon } from "../components/Icons";
import {
  GraduationCap,
  Building2,
  User,
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

interface SignupPageProps {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function SignupContent(props: SignupPageProps = {}) {
  if (props?.params) {
    React.use(props.params);
  }
  const resolvedSearchParams = props?.searchParams ? React.use(props.searchParams) : undefined;
  const router = useRouter();
  const searchParams = useSearchParams();
  const portalParam = (resolvedSearchParams?.portal as string) ?? searchParams.get("portal");
  const initialPortal = portalParam === "admin" ? "admin" : "student";

  const { register: registerUser, status } = useAuth();
  const [selectedPortal, setSelectedPortal] = useState<"student" | "admin">(initialPortal);
  const [prevParam, setPrevParam] = useState(searchParams.get("portal"));
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sync if URL query param changes
  const currentParam = searchParams.get("portal");
  if (currentParam !== prevParam) {
    setPrevParam(currentParam);
    if (currentParam === "admin" || currentParam === "student") {
      setSelectedPortal(currentParam);
    }
  }

  // Already signed in - redirect to dashboard
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      instituteCode: "DEMO",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const passwordValue = watch("password") || "";

  // Password criteria indicators
  const passwordChecks = [
    {
      label: "8-64 characters",
      passed: passwordValue.length >= 8 && passwordValue.length <= 64,
    },
    {
      label: "Upper & lowercase",
      passed: /[A-Z]/.test(passwordValue) && /[a-z]/.test(passwordValue),
    },
    { label: "Number (0-9)", passed: /[0-9]/.test(passwordValue) },
    {
      label: "Special character (!@#...)",
      passed: /[^A-Za-z0-9\s]/.test(passwordValue),
    },
    {
      label: "No spaces",
      passed: passwordValue.length > 0 && !/\s/.test(passwordValue),
    },
  ];

  const passedCount = passwordChecks.filter((c) => c.passed).length;

  const onSubmit = async (data: SignupFormData) => {
    try {
      setAuthError(null);
      await registerUser({
        name: data.fullName,
        email: data.email,
        password: data.password,
        instituteCode: data.instituteCode,
      });
      toast.success("Account created successfully! Welcome to InterviewAI.");
      router.push("/dashboard");
    } catch (error) {
      const message = getAuthErrorMessage(
        error,
        "Failed to create account. Please check your inputs and try again.",
      );
      toast.error(message);
      setAuthError(message);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-[#F9FAFD] px-4 py-8 sm:py-12 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Brand Logo */}
      <div className="w-full max-w-lg flex justify-center">
        <Link href="/" className="flex items-center gap-2.5 group focus:outline-none">
          <div className="transition-transform group-hover:scale-105 duration-200">
            <LogoIcon className="w-8 h-8 rounded-lg shadow-sm" />
          </div>
          <span className="text-[21px] font-bold tracking-tight text-slate-900 leading-none">
            InterviewAI
          </span>
        </Link>
      </div>

      {/* Centered Clean White Signup Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] my-auto">

        {/* Title */}
        <div className="mb-5 text-center">
          <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
            Create your account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {selectedPortal === "student"
              ? "Start realistic role-specific mock interviews under your institute"
              : "Institutional management, cohort analytics & custom rubrics"}
          </p>
        </div>

        {/* ─── 1. Account Type Chooser (Choose First) ─── */}
        <div className="mb-5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
            Choose account type
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setSelectedPortal("student");
                setAuthError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-[13px] font-semibold transition-all cursor-pointer ${selectedPortal === "student"
                ? "bg-white text-indigo-600 shadow-xs border border-slate-200/70"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Student Signup</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedPortal("admin");
                setAuthError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-[13px] font-semibold transition-all cursor-pointer ${selectedPortal === "admin"
                ? "bg-white text-indigo-600 shadow-xs border border-slate-200/70"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Organization</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium text-center">
            {authError}
          </div>
        )}

        {/* ─── 2A. Student Registration Form ─── */}
        {selectedPortal === "student" && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Alex Chen"
                    maxLength={50}
                    autoComplete="name"
                    {...register("fullName")}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 ${errors.fullName
                      ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                      : "border-slate-200 bg-slate-50/50 focus:border-[#4540DB] focus:bg-white focus:ring-indigo-500/20"
                      }`}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-red-600 text-[11px] font-medium mt-0.5 leading-tight">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="alex@example.com"
                    maxLength={100}
                    autoComplete="email"
                    {...register("email")}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 ${errors.email
                      ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                      : "border-slate-200 bg-slate-50/50 focus:border-[#4540DB] focus:bg-white focus:ring-indigo-500/20"
                      }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-600 text-[11px] font-medium mt-0.5 leading-tight">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Institute Join Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Institute Join Code
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. DEMO"
                  maxLength={30}
                  autoComplete="off"
                  {...register("instituteCode")}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm font-mono uppercase text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 ${errors.instituteCode
                    ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                    : "border-slate-200 bg-slate-50/50 focus:border-[#4540DB] focus:bg-white focus:ring-indigo-500/20"
                    }`}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Provided by your college or university to link you to your institute cohort & mock exams.
              </p>
              {errors.instituteCode && (
                <p className="text-red-600 text-[11px] font-medium mt-0.5 leading-tight">
                  {errors.instituteCode.message}
                </p>
              )}
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    maxLength={64}
                    autoComplete="new-password"
                    {...register("password")}
                    className={`w-full pl-9 pr-9 py-2 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 ${errors.password
                      ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                      : "border-slate-200 bg-slate-50/50 focus:border-[#4540DB] focus:bg-white focus:ring-indigo-500/20"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-600 text-[11px] font-medium mt-0.5 leading-tight">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    maxLength={64}
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                    className={`w-full pl-9 pr-9 py-2 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 ${errors.confirmPassword
                      ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                      : "border-slate-200 bg-slate-50/50 focus:border-[#4540DB] focus:bg-white focus:ring-indigo-500/20"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-600 text-[11px] font-medium mt-0.5 leading-tight">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {/* Password Strength Checklist */}
            {passwordValue.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Security strength</span>
                  <span
                    className={
                      passedCount < 3
                        ? "text-red-600 font-bold"
                        : passedCount < 5
                          ? "text-amber-600 font-bold"
                          : "text-emerald-600 font-bold"
                    }
                  >
                    {passedCount < 3 ? "Weak" : passedCount < 5 ? "Good" : "Strong"}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passedCount < 3
                      ? "bg-red-500 w-1/4"
                      : passedCount < 5
                        ? "bg-amber-500 w-3/4"
                        : "bg-emerald-500 w-full"
                      }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-0.5">
                  {passwordChecks.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-1.5 ${item.passed ? "text-emerald-700 font-medium" : "text-slate-400"
                        }`}
                    >
                      {item.passed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Informational Terms text (No checkbox) */}
            <p className="text-[11.5px] text-slate-500 text-center pt-1 leading-relaxed">
              By creating an account, you agree to our Terms of Service & Privacy Policy.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#4540DB] hover:bg-[#3934BE] active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(69,64,219,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-1"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account & Start Practice</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ─── 2B. Organization / Faculty Guidance (NO OAuth) ─── */}
        {selectedPortal === "admin" && (
          <div className="space-y-4 py-2">
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Building2 className="w-4 h-4" />
                <span>Institutional Governance & Provisioning</span>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                Faculty, university dean, and enterprise accounts are provisioned directly by organization administrators to maintain private cohort segregation and RBAC security.
              </p>
              {/* <div className="pt-2 border-t border-indigo-100/80 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Demo Institute Admin:</span>
                  <span className="font-mono text-indigo-700 font-bold">demo@gmail.com</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Demo Password:</span>
                  <span className="font-mono text-indigo-700 font-semibold">12345678</span>
                </div>
              </div> */}
            </div>

            <div className="flex flex-col gap-2.5">
              <Link
                href="/login?portal=admin"
                className="w-full py-2.5 px-4 rounded-xl bg-[#4540DB] hover:bg-[#3934BE] text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 text-center"
              >
                <span>Sign In as Organization Admin</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={() => setSelectedPortal("student")}
                className="w-full py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs sm:text-sm transition-colors cursor-pointer text-center"
              >
                Have an institute join code? Switch to Student Registration
              </button>
            </div>
          </div>
        )}

        {/* Footer switch to Login */}
        <p className="text-xs text-slate-500 text-center mt-4 pt-3 border-t border-slate-100">
          Already have an account?{" "}
          <Link
            href={selectedPortal === "admin" ? "/login?portal=admin" : "/login?portal=student"}
            className="font-bold text-indigo-600 hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>

      {/* Clean Light Footer */}
      <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 mt-4">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
        <span>Protected by Enterprise SSL Encryption · © {new Date().getFullYear()} InterviewAI</span>
      </div>
    </div>
  );
}

export default function SignupPage(props: SignupPageProps = {}) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F9FAFD]">
          <span className="inline-block w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SignupContent {...props} />
    </React.Suspense>
  );
}
