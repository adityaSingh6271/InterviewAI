"use client";

import React, { useState } from "react";
import {
  FileText,
  UserSquare2,
  Cpu,
  Video,
  LineChart,
  ArrowRight,
  Sparkles,
  Check,
  ChevronRight,
} from "lucide-react";

export default function WorkflowSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      step: "01",
      icon: FileText,
      title: "Ingest Target Job Spec",
      short: "Job Ingestion",
      tag: "Automated Stack Parsing",
      description:
        "Paste any raw job description or URL. Our parser isolates core tech requirements, scale expectations (QPS, storage, latency), and seniority expectations.",
      sample: "Identified: Distributed Systems · Kafka · Kubernetes · Go · L6 Staff Expectation",
    },
    {
      step: "02",
      icon: UserSquare2,
      title: "Cross-Reference Your Resume",
      short: "Resume Benchmarking",
      tag: "Semantic Alignment",
      description:
        "Upload your resume (PDF/DOCX). The engine maps your career history, past technical projects, and domain achievements against the target role.",
      sample: "Benchmarked: 5 yrs backend experience · Strong Go background · Gap: Cassandra internals",
    },
    {
      step: "03",
      icon: Cpu,
      title: "Synthesize Tailored Rubrics",
      short: "Rubric Calibration",
      tag: "Targeted Gap Detection",
      description:
        "The AI generates custom interview rubrics targeting your exact weak spots and the specific architectural challenges this team encounters daily.",
      sample: "Generated: 3 core focus areas designed to test failure mode isolation & leadership",
    },
    {
      step: "04",
      icon: Video,
      title: "Live Conversational Simulation",
      short: "Real-Time Mock",
      tag: "Voice & Real-Time Interlocutor",
      description:
        "Engage in live voice and text interviews. The AI dynamically pushes back on incomplete trade-offs, simulates edge cases, and mirrors hiring bar standards.",
      sample: "Interactive: 'Why choose eventual consistency over 2-phase commit for this ledger?'",
    },
    {
      step: "05",
      icon: LineChart,
      title: "Actionable Hiring Diagnostic",
      short: "Scorecard & Insights",
      tag: "Hiring Bar Breakdown",
      description:
        "Receive instant, comprehensive scorecards on technical accuracy, vocal pacing, structure, and direct coaching points before your real interview.",
      sample: "Scorecard: 94.8% Pass Likelihood · Technical Depth 89% · Delivery 142 WPM (Elite)",
    },
  ];

  return (
    <section id="how-it-works" className="w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 bg-white relative">
      <div className="max-w-6xl mx-auto">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>The Execution Engine</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-950 tracking-tight leading-tight">
            How Job Spec + Resume
            <br />
            <span className="text-indigo-600">turns into offer-winning mastery.</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 mt-4 leading-relaxed font-normal">
            A structured five-phase pipeline that eliminates guesswork and builds muscle memory for high-pressure technical rounds.
          </p>
        </div>

        {/* Interactive Step Switcher & Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Vertical Step Selector */}
          <div className="lg:col-span-5 space-y-3">
            {steps.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = activeStep === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`w-full text-left p-4 sm:p-4.5 rounded-xl transition-all duration-200 border flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-indigo-500/20"
                      : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`font-mono text-xs font-bold px-2 py-1 rounded flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.step}
                    </span>
                    <div className="truncate">
                      <div className={`text-sm font-semibold truncate ${isSelected ? "text-white" : "text-slate-900"}`}>
                        {item.title}
                      </div>
                      <div className={`text-xs ${isSelected ? "text-indigo-300" : "text-slate-500"}`}>
                        {item.tag}
                      </div>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? "text-indigo-400 translate-x-0.5" : "text-slate-400"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Right Column: Deep Dive Display Card for Active Step */}
          <div className="lg:col-span-7 bg-slate-950 text-white rounded-2xl p-7 sm:p-9 border border-slate-800 shadow-xl flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-indigo-950 border border-indigo-700 text-indigo-300">
                    STAGE {steps[activeStep].step}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {steps[activeStep].tag}
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-mono">Automated Pipeline</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                {steps[activeStep].title}
              </h3>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 font-normal">
                {steps[activeStep].description}
              </p>

              {/* Sample Output Terminal Pill */}
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  Engine Telemetry Output
                </div>
                <div className="text-xs sm:text-sm font-mono text-indigo-300">
                  {steps[activeStep].sample}
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Continuously calibrated with every attempt
              </span>
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
                className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                Next Phase <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
