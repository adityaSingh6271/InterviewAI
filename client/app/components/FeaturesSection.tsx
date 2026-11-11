"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ScanDocumentIcon,
  AnalyticsBarIcon,
  SparklesIcon,
  LightningIcon,
} from "./Icons";

export default function FeaturesSection() {
  const router = useRouter();

  const features = [
    {
      icon: ScanDocumentIcon,
      title: "Smart Resume Parsing",
      description:
        "Upload your resume to extract your tech stack, system scope, and past projects to generate targeted scenario questions.",
    },
    {
      icon: AnalyticsBarIcon,
      title: "Sub-Second Telemetry",
      description:
        "Real-time evaluation of speech cadence, filler word frequency, and vocal confidence calculated continuously during the call.",
    },
    {
      icon: SparklesIcon,
      title: "Realistic AI Avatars",
      description:
        "High-fidelity AI interviewers calibrated on Big Tech hiring committee standards with realistic interruptions and follow-ups.",
    },
    {
      icon: LightningIcon,
      title: "Adaptive Questioning",
      description:
        "Questions dynamically pivot and challenge architectural choices, scaling bottlenecks, and failure recovery based on your answers.",
    },
  ];

  return (
    <section
      id="features"
      className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16"
    >
      <div className="max-w-384 mx-auto">
        {/* Standard Centered Section Header */}
        <div className="text-center max-w-210 mx-auto mb-10 sm:mb-12">
          <span className="inline-block px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-100/90 text-indigo-700 text-[12px] font-semibold tracking-wide uppercase mb-2.5">
            Enterprise-Grade Interview Prep
          </span>
          <h2 className="text-[30px] sm:text-[36px] lg:text-[40px] xl:text-[42px] font-bold text-slate-900 tracking-tight leading-[1.15] whitespace-normal lg:whitespace-nowrap">
            Engineered to help you clear every round
          </h2>
          <p className="text-[15px] sm:text-[16px] text-slate-600 mt-3 leading-relaxed">
            From technical system design to behavioral leadership, InterviewAI
            delivers calibrated realism with immediate diagnostic clarity.
          </p>
        </div>

        {/* 4 Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                onClick={() => router.push("/dashboard")}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-[16px] font-bold text-slate-900 mb-2 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-[13.5px] sm:text-[14px] text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4  flex items-center text-[13px] font-semibold text-indigo-600 group-hover:text-indigo-700">
                  <span>Learn more</span>
                  <span
                    className="ml-1 group-hover:translate-x-1 transition-transform duration-150"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
