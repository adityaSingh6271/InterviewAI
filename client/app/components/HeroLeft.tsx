"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GoogleIcon, GithubIcon, LightningIcon } from "./Icons";
import { ShieldCheck } from "lucide-react";

const heroEmailSchema = z.object({
  email: z
    .string()
    .min(1, "Please enter your work or personal email")
    .email("Please enter a valid email address"),
});

type HeroEmailForm = z.infer<typeof heroEmailSchema>;

// Removed unused productPillars

export default function HeroLeft() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HeroEmailForm>({
    resolver: zodResolver(heroEmailSchema),
    defaultValues: { email: "" },
    mode: "onSubmit",
  });

  const onSubmit = () => router.push("/dashboard");
  const handleOAuth = () => router.push("/dashboard");

  return (
    <div className="flex flex-col w-full max-w-full lg:max-w-160 xl:max-w-175 text-left">
      {/* Eyebrow Pill */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/90 text-indigo-700 text-[12px] font-semibold tracking-tight mb-3.5 self-start">
        <LightningIcon className="w-3.5 h-3.5 text-indigo-600" />
        <span>Next-Gen Technical & Behavioral Prep</span>
      </div>

      {/* Hero Headline: Explicit Two-Line Structure */}
      <h1 className="text-[32px] sm:text-[40px] md:text-[46px] lg:text-[42px] xl:text-[48px] 2xl:text-[54px] font-bold text-slate-900 tracking-tight leading-[1.1] mb-3.5">
        <span className="block lg:whitespace-nowrap">
          Nail your next interview
        </span>
        <span className="block">
          with <span className="text-indigo-600">AI Precision.</span>
        </span>
      </h1>

      {/* Supporting Copy */}
      <p className="text-[15px] sm:text-[16px] text-slate-600 leading-relaxed max-w-155 mb-5">
        Practice realistic technical and behavioral interviews with AI. Receive
        instant, actionable feedback on technical depth, communication clarity,
        and problem-solving.
      </p>

      {/* Sign-up / Practice Card */}
      <div className="w-full max-w-full lg:max-w-125 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between mb-3.5">
          <p className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">
            Start Free Practice Session
          </p>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
            No credit card required
          </span>
        </div>

        {/* Email form with primary CTA dominating */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3"
          noValidate
        >
          <div>
            <label htmlFor="hero-email" className="sr-only">
              Work or personal email
            </label>
            <input
              id="hero-email"
              type="email"
              placeholder="Enter your work or personal email"
              {...register("email")}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-[14px] transition-all focus:outline-none focus:ring-2 ${
                errors.email
                  ? "border-red-400 bg-red-50/20 focus:ring-red-200"
                  : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20"
              }`}
            />
            {errors.email && (
              <p className="text-red-600 text-[12px] font-medium mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-[14.5px] shadow-sm hover:shadow transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <span>Start Job Interview Prep</span>
            <span aria-hidden="true">→</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-3 flex items-center">
          <div className="w-full border-t border-slate-100" />
          <span className="absolute left-1/2 -translate-x-1/2 bg-white px-2.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            or continue with
          </span>
        </div>

        {/* Secondary Social Login Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleOAuth}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <GoogleIcon className="w-4 h-4" />
            <span>Google</span>
          </button>
          <button
            type="button"
            onClick={handleOAuth}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <GithubIcon className="w-4 h-4 text-slate-800" />
            <span>GitHub</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-3 leading-relaxed">
          By signing up you agree to our{" "}
          <a
            href="#terms"
            className="underline hover:text-slate-600 transition-colors"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="#privacy"
            className="underline hover:text-slate-600 transition-colors"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>

      {/* Honest Capability Highlights / Pillars */}
      {/* <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-4 w-full max-w-full lg:max-w-150">
        {productPillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div
              key={idx}
              className="flex flex-col bg-white/70 rounded-xl p-2.5 border border-slate-200/60"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-[12px] font-bold text-slate-900 leading-tight truncate">
                  {pillar.title}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 leading-tight">
                {pillar.desc}
              </span>
            </div>
          );
        })}
      </div> */}

      {/* Trust & Rating Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3.5 text-[12px] text-slate-500 w-full max-w-full lg:max-w-125">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Private & isolated candidate sessions</span>
        </div>
        <div className="flex items-center gap-1 text-[11.5px] font-medium text-slate-600">
          <span className="text-amber-500">★</span>
          <span>4.9/5 calibrated by FAANG candidates</span>
        </div>
      </div>
    </div>
  );
}
