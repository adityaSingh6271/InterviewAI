"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormData } from "../lib/validations";
import { getAuthErrorMessage } from "../lib/authErrors";
import { useAuth } from "../components/providers/AuthProvider";
import { LogoIcon } from "../components/Icons";
import {
  GraduationCap,
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

interface LoginPageProps {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function LoginContent(props: LoginPageProps = {}) {
  if (props?.params) {
    React.use(props.params);
  }
  const resolvedSearchParams = props?.searchParams ? React.use(props.searchParams) : undefined;
  const router = useRouter();
  const searchParams = useSearchParams();
  const portalParam = (resolvedSearchParams?.portal as string) ?? searchParams.get("portal");
  const initialPortal = portalParam === "admin" ? "admin" : "student";

  const { login, status, user } = useAuth();
  const [selectedPortal, setSelectedPortal] = useState<"student" | "admin">(initialPortal);
  const [prevParam, setPrevParam] = useState(searchParams.get("portal"));
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Sync if URL query param changes
  const currentParam = searchParams.get("portal");
  if (currentParam !== prevParam) {
    setPrevParam(currentParam);
    if (currentParam === "admin" || currentParam === "student") {
      setSelectedPortal(currentParam);
    }
  }

  // Already signed in - redirect to proper destination
  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(user.portal === "admin" ? "/admin" : "/dashboard");
    }
  }, [status, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setAuthError(null);
      const session = await login({
        email: data.email,
        password: data.password,
        portal: selectedPortal,
      });

      const isAdmin = session.user.portal === "admin";
      toast.success(
        isAdmin
          ? "Authenticated as Organization Admin. Redirecting to admin console..."
          : "Welcome back! Redirecting to dashboard...",
      );
      router.push(isAdmin ? "/admin" : "/dashboard");
    } catch (error) {
      const message = getAuthErrorMessage(
        error,
        "Sign in failed. Please check your credentials.",
      );
      toast.error(message);
      setAuthError(message);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-[#F9FAFD] px-4 py-8 sm:py-12 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Brand Logo - Click to Home */}
      <div className="w-full max-w-md flex justify-center">
        <Link href="/" className="flex items-center gap-2.5 group focus:outline-none">
          <div className="transition-transform group-hover:scale-105 duration-200">
            <LogoIcon className="w-8 h-8 rounded-lg shadow-sm" />
          </div>
          <span className="text-[21px] font-bold tracking-tight text-slate-900 leading-none">
            InterviewAI
          </span>
        </Link>
      </div>

      {/* Centered Clean White Login Card */}
      <div className="w-full max-w-[430px] bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] my-auto">

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {selectedPortal === "student"
              ? "Sign in to continue your AI mock interview practice"
              : "Sign in to the institutional administrator console"}
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
              <span>Student Login</span>
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

        {/* ─── 2. Credential Form ─── */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {selectedPortal === "student" ? "Student Email" : "Institutional Email"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                placeholder={selectedPortal === "student" ? "student@demo.com" : "demo@gmail.com"}
                maxLength={100}
                autoComplete="email"
                {...register("email")}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 ${errors.email
                    ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                    : "border-slate-200 bg-slate-50/50 focus:border-[#4540DB] focus:bg-white focus:ring-indigo-500/20"
                  }`}
              />
            </div>
            {errors.email && (
              <p className="text-red-600 text-xs font-medium mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  toast("Password reset link will be sent to your registered email.", { icon: "📧" });
                }}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                maxLength={64}
                autoComplete="current-password"
                {...register("password")}
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 ${errors.password
                    ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                    : "border-slate-200 bg-slate-50/50 focus:border-[#4540DB] focus:bg-white focus:ring-indigo-500/20"
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center p-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-600 text-xs font-medium mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-[#4540DB] hover:bg-[#3934BE] active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(69,64,219,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {selectedPortal === "student" ? "Sign In to Dashboard" : "Sign In to Organization"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link to Signup */}
        <p className="text-xs text-slate-500 text-center mt-5 pt-4 border-t border-slate-100">
          {selectedPortal === "student" ? (
            <>
              Don&apos;t have an account?{" "}
              <Link
                href="/signup?portal=student"
                className="font-bold text-indigo-600 hover:underline"
              >
                Sign Up with Join Code
              </Link>
            </>
          ) : (
            <>
              Need to register your institution?{" "}
              <Link
                href="/signup?portal=admin"
                className="font-bold text-indigo-600 hover:underline"
              >
                Organization Setup
              </Link>
            </>
          )}
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

export default function LoginPage(props: LoginPageProps = {}) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F9FAFD]">
          <span className="inline-block w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent {...props} />
    </React.Suspense>
  );
}
