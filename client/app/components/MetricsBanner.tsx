"use client";

import React from "react";
import { TrendingUp, Users, Award, Zap } from "lucide-react";

export default function MetricsBanner() {
  const metrics = [
    {
      icon: Award,
      value: "94.8%",
      label: "Hiring Bar Accuracy",
      desc: "Calibrated to verified L4–L7 rubrics",
    },
    {
      icon: Users,
      value: "14,500+",
      label: "Simulations Completed",
      desc: "By engineers & technical leaders",
    },
    {
      icon: Zap,
      value: "<380ms",
      label: "Audio Latency",
      desc: "Natural, conversational dialogue",
    },
    {
      icon: TrendingUp,
      value: "+31%",
      label: "Higher Offer Rate",
      desc: "Compared to unassisted preparation",
    },
  ];

  return (
    <section className="w-full border-y border-slate-200/80 bg-slate-50/70 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {metrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4 text-indigo-600" />
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                    {item.value}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-900">
                  {item.label}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  {item.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

