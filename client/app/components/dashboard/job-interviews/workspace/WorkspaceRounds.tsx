"use client";

import React from "react";
import type { JobInterview, InterviewRound } from "@/lib/types/jobInterview";
import RoundCard from "../RoundCard";

interface WorkspaceRoundsProps {
  interview: JobInterview;
  onStartAttempt: (round: InterviewRound) => void;
}

export default function WorkspaceRounds({
  interview,
  onStartAttempt,
}: WorkspaceRoundsProps) {
  // Sort rounds sequentially so students see Round 1, 2, 3, 4 in proper order
  const sortedRounds = [...interview.rounds].sort((a, b) => a.order - b.order);

  return (
    <div className="pt-2">
      {/* Practice Rounds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedRounds.map((round) => (
          <RoundCard
            key={round.id}
            round={round}
            onStartAttempt={onStartAttempt}
          />
        ))}
      </div>
    </div>
  );
}
