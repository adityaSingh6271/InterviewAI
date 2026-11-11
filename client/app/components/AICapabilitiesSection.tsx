"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { 
  FileSearch, 
  Layers, 
  Sparkles, 
  RotateCcw, 
  MessageSquareCheck, 
  Award,
  Zap,
} from "lucide-react";

interface CapabilityItem {
  category: string;
  icon: LucideIcon;
  title: string;
  description: string;
  badge: string;
}

const CAPABILITIES: CapabilityItem[] = [
  {
    category: "Requisition Analysis",
    icon: FileSearch,
    title: "Granular Stack & Scale Extraction",
    description:
      "Isolates mandatory tech requirements, throughput specs (QPS, concurrency), fault-tolerance constraints, and domain requirements directly from the job spec.",
    badge: "Natural Language Parser",
  },
  {
    category: "Competency Benchmarking",
    icon: Layers,
    title: "Asymmetric Skill-Gap Detection",
    description:
      "Pins your resume directly against the job requirements, surfacing blind spots in architectural depth or missing stack competencies before the interview.",
    badge: "Targeted Diagnostic",
  },
  {
    category: "Dynamic Simulation",
    icon: Sparkles,
    title: "Custom Scenario Generation",
    description:
      "Generates realistic system design, distributed data partitioning, and real-time behavioral challenges mirroring company-specific interview formats.",
    badge: "Zero Generic Trivia",
  },
  {
    category: "Conversational Intelligence",
    icon: MessageSquareCheck,
    title: "Adaptive Interlocutor Pushback",
    description:
      "Interviews are never scripted FAQs. The AI pushes back when your answer lacks detail, asks for trade-offs, and challenges architectural bottlenecks.",
    badge: "Multi-Turn Dialogue",
  },
  {
    category: "Muscle Memory",
    icon: RotateCcw,
    title: "Targeted Round Iterations",
    description:
      "Drill down on difficult rounds as many times as needed. Test alternative system designs and verify your score improvement across successive attempts.",
    badge: "Iterative Mastery",
  },
  {
    category: "Evaluation Bar",
    icon: Award,
    title: "Calibrated Hiring Rubrics",
    description:
      "Objective scorecards evaluate your responses against authentic hiring committee bars (L4 Mid-level, L5 Senior, L6 Staff, and L7 Principal).",
    badge: "Level-Calibrated",
  },
];

export default function AICapabilitiesSection() {
  return (
    <section
      id="features"
      aria-label="Product Capabilities"
      className="w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 bg-slate-50/50 relative"
    >
      <div className="max-w-6xl mx-auto">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Zap className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
            <span>Autonomous Intelligence</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-950 tracking-tight leading-tight">
            Built for how top engineering teams actually interview.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 mt-4 leading-relaxed font-normal">
            No rote flashcards. No generic question banks. Just rigorous, role-specific interview simulation.
          </p>
        </div>

        {/* 6 Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-105 duration-200">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/70">
                      {item.badge}
                    </span>
                  </div>

                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block mb-1.5">
                    {item.category}
                  </span>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2.5 leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
