"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, Zap } from "lucide-react";

export default function PricingSection() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const tiers = [
    {
      name: "Free Practice",
      tagline: "Essential simulation for active job seekers",
      priceMonthly: "$0",
      priceYearly: "$0",
      period: "forever",
      features: [
        "1 full AI mock interview session",
        "Automated job description & resume parsing",
        "Basic vocal cadence & pacing metrics",
        "Instant diagnostic performance scorecard",
        "Standard interview question rubrics",
      ],
      isPopular: false,
      buttonText: "Start Free Practice",
      buttonVariant: "secondary" as const,
      action: () => router.push("/dashboard/interviews/new"),
    },
    {
      name: "Pro Candidate",
      tagline: "Uncapped simulation for competitive engineering loops",
      priceMonthly: "$29",
      priceYearly: "$22",
      period: "per month",
      savings: "Save 25% billed annually",
      features: [
        "Unlimited real-time voice & chat mock interviews",
        "Dynamic job-specific problem generation",
        "Sub-second tone, vocal & cadence telemetry",
        "Granular skill-gap diagnostic breakdown",
        "Multi-attempt comparison & progress tracking",
        "Calibrated L4–L7 hiring committee rubrics",
        "Priority LLM inference queue",
      ],
      isPopular: true,
      buttonText: "Get Pro Access",
      buttonVariant: "default" as const,
      action: () => router.push("/signup"),
    },
    {
      name: "Institutes & Orgs",
      tagline: "For universities, bootcamps, and career accelerators",
      priceMonthly: "$79",
      priceYearly: "$64",
      period: "per seat / mo",
      savings: "Custom volume licensing",
      features: [
        "Everything included in Pro Candidate",
        "Custom institutional rubric calibration",
        "Cohort administrative analytics dashboard",
        "Student progress monitoring & invite codes",
        "Bring Your Own LLM API keys (BYOK)",
        "Dedicated onboarding & faculty training",
      ],
      isPopular: false,
      buttonText: "Join with Code",
      buttonVariant: "outline" as const,
      action: () => router.push("/signup"),
    },
  ];

  return (
    <section id="pricing" className="w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 bg-slate-50/50 relative">
      <div className="max-w-6xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Transparent Investment</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-950 tracking-tight leading-tight">
            Predictable plans.
            <br />
            <span className="text-indigo-600">Zero surprise commitments.</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 mt-4 leading-relaxed font-normal">
            Prepare for your upcoming loops with total confidence. Cancel anytime with a single click.
          </p>

          {/* Billing Cycle Switch */}
          <div className="inline-flex items-center bg-slate-200/80 p-1 rounded-xl mt-6 border border-slate-300/80 text-xs font-medium">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Annual Billing
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                -25%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-200 relative ${
                tier.isPopular
                  ? "bg-slate-950 text-white border-2 border-indigo-500 shadow-2xl ring-4 ring-indigo-500/10 scale-100 lg:-translate-y-2"
                  : "bg-white text-slate-900 border border-slate-200/90 shadow-xs hover:border-slate-300"
              }`}
            >
              {tier.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Most Popular for Job Seekers
                </div>
              )}

              <div>
                <h3 className={`text-xl font-bold mb-1 ${tier.isPopular ? "text-white" : "text-slate-900"}`}>
                  {tier.name}
                </h3>
                <p className={`text-xs mb-6 ${tier.isPopular ? "text-slate-400" : "text-slate-500"}`}>
                  {tier.tagline}
                </p>

                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${tier.isPopular ? "text-white" : "text-slate-950"}`}>
                    {billingCycle === "yearly" ? tier.priceYearly : tier.priceMonthly}
                  </span>
                  <span className={`text-xs font-medium ${tier.isPopular ? "text-slate-400" : "text-slate-500"}`}>
                    /{tier.period}
                  </span>
                </div>

                <div className={`space-y-3.5 text-xs sm:text-sm mb-8 pt-6 border-t ${tier.isPopular ? "border-slate-800" : "border-slate-100"}`}>
                  {tier.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${tier.isPopular ? "text-emerald-400" : "text-indigo-600"}`} />
                      <span className={tier.isPopular ? "text-slate-300" : "text-slate-700"}>
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={tier.action}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    tier.isPopular
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                  }`}
                >
                  {tier.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
