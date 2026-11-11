import type {
  ExtractedJobData,
  ParsedResume,
  ResumeMatchAnalysis,
  SkillGap,
  ImprovementArea,
  MatchLabel,
} from "@/lib/types/jobInterview";

// Helper: Normalize string for comparison
function norm(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Compares extracted job requirements against candidate parsed resume
 * and produces a detailed match score, skill breakdown, and improvement suggestions.
 */
export async function analyzeResumeMatch(params: {
  jobData: ExtractedJobData;
  parsedResume: ParsedResume;
}): Promise<ResumeMatchAnalysis> {
  // Simulate AI latency for realistic UX
  await new Promise((resolve) => setTimeout(resolve, 1400));

  const { jobData, parsedResume } = params;

  const candidateSkillsNorm = new Set([
    ...parsedResume.skills.map(norm),
    ...parsedResume.technologies.map(norm),
  ]);

  const matchedSkills: string[] = [];
  const missingSkills: SkillGap[] = [];

  // Check required skills
  for (const skill of jobData.requiredSkills) {
    const sNorm = norm(skill);
    const found = Array.from(candidateSkillsNorm).some(
      (c) => c.includes(sNorm) || sNorm.includes(c)
    );
    if (found) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push({
        skill,
        priority: "high",
        reason: `Explicitly required for ${jobData.roleTitle}`,
      });
    }
  }

  // Check preferred skills
  for (const skill of jobData.preferredSkills) {
    const sNorm = norm(skill);
    const found = Array.from(candidateSkillsNorm).some(
      (c) => c.includes(sNorm) || sNorm.includes(c)
    );
    if (found) {
      if (!matchedSkills.includes(skill)) matchedSkills.push(skill);
    } else {
      missingSkills.push({
        skill,
        priority: "medium",
        reason: "Listed as preferred qualification",
      });
    }
  }

  // Check technologies
  for (const tech of jobData.technologies) {
    const tNorm = norm(tech);
    const found = Array.from(candidateSkillsNorm).some(
      (c) => c.includes(tNorm) || tNorm.includes(c)
    );
    if (found && !matchedSkills.includes(tech)) {
      matchedSkills.push(tech);
    } else if (!found && !missingSkills.some((m) => m.skill === tech)) {
      missingSkills.push({
        skill: tech,
        priority: "medium",
        reason: "Core technology stack item",
      });
    }
  }

  // Calculate score
  const totalRequired = Math.max(jobData.requiredSkills.length, 1);
  const matchedRequiredCount = jobData.requiredSkills.filter((s) =>
    matchedSkills.includes(s)
  ).length;
  const baseReqRatio = matchedRequiredCount / totalRequired;

  const totalTech = Math.max(jobData.technologies.length, 1);
  const matchedTechCount = jobData.technologies.filter((t) =>
    matchedSkills.includes(t)
  ).length;
  const techRatio = matchedTechCount / totalTech;

  // Experience bonus/penalty
  let expBonus = 0;
  const candExp = parsedResume.experienceYears || 0;
  if (jobData.seniority === "Lead" || jobData.seniority === "Staff") {
    expBonus = candExp >= 6 ? 10 : -10;
  } else if (jobData.seniority === "Senior") {
    expBonus = candExp >= 4 ? 8 : -8;
  } else if (jobData.seniority === "Mid-Level") {
    expBonus = candExp >= 2 ? 5 : 0;
  }

  const rawScore = Math.round(baseReqRatio * 55 + techRatio * 35 + 10 + expBonus);
  const overallScore = Math.max(25, Math.min(96, rawScore));

  let matchLabel: MatchLabel = "moderate";
  if (overallScore >= 75) matchLabel = "strong";
  else if (overallScore < 50) matchLabel = "weak";

  // Experience alignment summary
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (matchedSkills.length > 0) {
    strengths.push(
      `Strong alignment in core stack: ${matchedSkills.slice(0, 3).join(", ")}`
    );
  }
  if (candExp > 0) {
    strengths.push(
      `Has ~${candExp} years of relevant industry experience.`
    );
  }
  if (parsedResume.projects && parsedResume.projects.length > 0) {
    strengths.push(`Portfolio demonstrates practical project delivery.`);
  }

  if (missingSkills.filter((m) => m.priority === "high").length > 0) {
    const highMissing = missingSkills
      .filter((m) => m.priority === "high")
      .map((m) => m.skill)
      .slice(0, 2)
      .join(", ");
    gaps.push(`Key required competencies not explicitly highlighted: ${highMissing}`);
  }

  if (jobData.seniority === "Senior" && candExp < 4) {
    gaps.push(`May need to highlight senior architectural leadership experience.`);
  }

  const experienceAlignment = {
    summary:
      overallScore >= 75
        ? "Resume demonstrates strong background aligned with the core demands of this role."
        : overallScore >= 50
        ? "Candidate has foundational skills with targeted growth areas for this specific position."
        : "Resume exhibits notable skill gaps compared to the mandatory criteria in the job description.",
    strengths,
    gaps: gaps.length > 0 ? gaps : ["No major blockers identified."],
  };

  // Actionable Improvement suggestions
  const improvementAreas: ImprovementArea[] = [];

  if (missingSkills.length > 0) {
    const topMissing = missingSkills.slice(0, 2);
    topMissing.forEach((gap) => {
      improvementAreas.push({
        title: `Emphasize experience with ${gap.skill}`,
        priority: gap.priority,
        description: `The job description heavily prioritizes ${gap.skill}.`,
        suggestion: `Prepare concrete stories and examples demonstrating your ability to learn or apply ${gap.skill} in production.`,
      });
    });
  }

  if (jobData.category === "Engineering" || jobData.category === "Technical") {
    improvementAreas.push({
      title: "System Design & Architecture Deep-dive",
      priority: "medium",
      description: "Expect in-depth questions evaluating scalability, tradeoffs, and reliability.",
      suggestion: "Review distributed system fundamentals, caching, data consistency, and architectural trade-offs.",
    });
  } else {
    improvementAreas.push({
      title: "Behavioral & Impact STAR Stories",
      priority: "medium",
      description: "Interviewers will probe for specific metric-driven outcomes and cross-functional leadership.",
      suggestion: "Structure 4-5 STAR stories highlighting conflict resolution, project leadership, and business value.",
    });
  }

  return {
    overallScore,
    matchLabel,
    matchedSkills,
    missingSkills,
    experienceAlignment,
    improvementAreas,
  };
}
