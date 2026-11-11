"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Activity, ArrowRight } from "lucide-react";

export default function HowItWorksSection() {
  const router = useRouter();

  const steps = [
    {
      number: "01",
      tag: "Calibration",
      title: "Set Your Role & Rubric",
      description:
        "Select your target track (Staff SWE, System Design, Engineering Manager) and target company. The system configures authentic hiring committee rubrics.",
      details: (
        <div className="space-y-2 text-[12.5px]">
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-500">Target Track</span>
            <span className="font-semibold text-slate-900">
              Staff / Senior SWE
            </span>
          </div>
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-500">Evaluation Rubric</span>
            <span className="font-semibold text-indigo-600">
              Big Tech L5–L7 Criteria
            </span>
          </div>
        </div>
      ),
    },
    {
      number: "02",
      tag: "Live Simulation",
      title: "Face the AI Interview",
      description:
        "Step into a live voice & video mock session with Dr. Aris Thorne. Practice under real pressure with dynamic follow-up questioning.",
      isHighlighted: true,
      details: (
        <div className="space-y-2.5">
          <div className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 text-[13px] text-slate-200 border border-slate-700/60 leading-snug">
            &ldquo;Walk me through how you handle split-brain in your
            distributed cache cluster.&rdquo;
          </div>
          <div className="flex items-center justify-between text-[12px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              Speech Cadence
            </span>
            <span className="text-emerald-400 font-semibold">
              138 WPM · Optimal
            </span>
          </div>
        </div>
      ),
    },
    {
      number: "03",
      tag: "Diagnostics",
      title: "Get Your Scorecard",
      description:
        "Receive a comprehensive diagnostic breakdown: technical architecture depth, delivery clarity, filler words, and prioritized areas to improve.",
      details: (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100 text-[12.5px]">
            <span className="font-semibold text-emerald-900">
              Hiring Probability
            </span>
            <span className="font-bold text-emerald-700">
              94.8% · Strong Candidate
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11.5px]">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
              <span className="block font-semibold text-slate-800">
                Architecture
              </span>
              <span className="text-indigo-600 font-bold">88% Depth</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
              <span className="block font-semibold text-slate-800">
                Communication
              </span>
              <span className="text-teal-600 font-bold">76% Clarity</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section
      id="how-it-works"
      className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 "
    >
      <div className="max-w-[1536px] mx-auto">
        {/* Standard Centered Section Header */}
        <div className="text-center max-w-[720px] mx-auto mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/90 text-indigo-700 text-[11.5px] font-semibold tracking-wide uppercase mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Structured 3-Stage Methodology</span>
          </span>
          <h2 className="text-[30px] sm:text-[36px] lg:text-[40px] font-bold text-slate-900 tracking-tight leading-[1.12]">
            How InterviewAI Works
          </h2>
          <p className="text-[15px] sm:text-[16px] text-slate-600 mt-3 leading-relaxed">
            Calibrate to your target role, simulate realistic interview
            pressure, and diagnose your exact weaknesses in one continuous loop.
          </p>
        </div>

        {/* 3 Step Progression Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-6 sm:p-7 lg:p-8 flex flex-col justify-between transition-all duration-200 ${
                step.isHighlighted
                  ? "bg-slate-900 text-white border border-slate-800 shadow-md"
                  : "bg-white text-slate-900 border border-slate-200/80 shadow-xs"
              }`}
            >
              <div>
                {/* Step Header & Badge */}
                <div className="flex items-center justify-between mb-5">
                  <span
                    className={`w-9 h-9 rounded-xl font-mono font-bold text-[14px] flex items-center justify-center ${
                      step.isHighlighted
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                    }`}
                  >
                    {step.number}
                  </span>
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                      step.isHighlighted
                        ? "bg-slate-800 text-emerald-400 border border-slate-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {step.tag}
                  </span>
                </div>

                <h3
                  className={`text-[18px] sm:text-[19px] font-bold tracking-tight mb-2.5 ${
                    step.isHighlighted ? "text-white" : "text-slate-900"
                  }`}
                >
                  {step.title}
                </h3>
                <p
                  className={`text-[14px] leading-relaxed mb-6 ${
                    step.isHighlighted ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {step.description}
                </p>
              </div>

              {/* Step Detail Visualization */}
              <div className="pt-2">{step.details}</div>
            </div>
          ))}
        </div>

        {/* ── Final Conversion CTA Banner ── */}
        <div className="mt-12 sm:mt-14 p-8 sm:p-10 lg:p-12 rounded-2xl bg-indigo-600 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_12px_36px_-8px_rgba(79,70,229,0.3)]">
          <div className="max-w-xl text-center md:text-left">
            <h3 className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-tight">
              Ready for your next interview?
            </h3>
            <p className="text-[14.5px] sm:text-[15.5px] text-indigo-100 mt-1.5 leading-relaxed">
              Practice once. Understand your gaps. Walk into the real interview
              prepared.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="shrink-0 w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white text-indigo-700 hover:bg-slate-50 active:bg-slate-100 font-semibold text-[14.5px] shadow-sm cursor-pointer transition-all duration-150 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600"
          >
            <span>Start Free Interview</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
