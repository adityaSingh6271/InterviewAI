"use client";

import React from "react";
import type { InterviewRound } from "@/lib/types/jobInterview";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Trophy,
  Code,
  Layers,
  Cpu,
  MessageSquare,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import IconButton from "@/components/common/icon-button";

interface RoundCardProps {
  round: InterviewRound;
  onStartAttempt: (round: InterviewRound) => void;
  onViewDetails?: (round: InterviewRound) => void;
}

function RoundTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "technical":
      return <Cpu className="size-3 text-[#0C356A]" />;
    case "coding":
      return <Code className="size-3 text-[#0C356A]" />;
    case "system_design":
      return <Layers className="size-3 text-[#0C356A]" />;
    case "behavioral":
      return <MessageSquare className="size-3 text-[#0C356A]" />;
    case "hr":
      return <UserCheck className="size-3 text-[#0C356A]" />;
    default:
      return <ShieldCheck className="size-3 text-[#0C356A]" />;
  }
}

export default function RoundCard({
  round,
  onStartAttempt,
  onViewDetails,
}: RoundCardProps) {
  const isCompleted = round.status === "completed";

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-[#0C356A]/50 hover:shadow-sm transition-all duration-200 flex flex-col justify-between gap-4">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-lg bg-[#0C356A]/10 text-[#0C356A] flex items-center justify-center font-medium text-xs">
              R{round.order}
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize border border-slate-200/60">
              <RoundTypeIcon type={round.type} />
              {round.type.replace("_", " ")}
            </span>
          </div>

          <div>
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="size-3" />
                Completed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                Not Attempted
              </span>
            )}
          </div>
        </div>

        {/* Title & Desc */}
        <h4 className="text-[14.5px] sm:text-[15px] font-semibold text-slate-900 mb-1 leading-snug">
          {round.title}
        </h4>
        <p className="text-xs sm:text-[12.5px] text-slate-500 font-normal line-clamp-2 leading-relaxed">
          {round.description}
        </p>
      </div>

      {/* Stats & Action Footer */}
      <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-slate-600 font-normal">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5 text-slate-400" />
            {round.estimatedDurationMinutes}m
          </span>
          {isCompleted && round.bestScore !== undefined && (
            <span className="flex items-center gap-1 font-medium text-emerald-600">
              <Trophy className="size-3.5 text-amber-500" />
              Best: {round.bestScore}%
            </span>
          )}
          {round.attempts > 0 && (
            <span>
              {round.attempts} {round.attempts === 1 ? "attempt" : "attempts"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isCompleted ? (
            <IconButton
              type="button"
              icon={<RotateCcw className="size-4" />}
              label="Retake"
              onClick={() => onStartAttempt(round)}
              variant="outline"
              size="sm"
            />
          ) : (
            <IconButton
              type="button"
              icon={<Play className="size-4" />}
              label="Start Simulation"
              onClick={() => onStartAttempt(round)}
              variant="default"
              size="sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}
