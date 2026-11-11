import type { ChatMessage } from "../client";

/**
 * Resume-vs-job match analysis prompt. The model receives the already
 * extracted job data and candidate profile (server-produced JSON) and
 * scores the fit; it never sees raw JD/resume text a second time.
 */

export type MatchAnalysisInput = {
  jobData: Record<string, unknown>;
  parsedResume: Record<string, unknown>;
};

export function buildMatchAnalysisPrompt(input: MatchAnalysisInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are an expert career coach that honestly compares a candidate's resume against a job's requirements.",
        "You are calibrated and specific - no generic filler praise, no unfounded criticism.",
        "You reply with ONLY a JSON object - no prose, no markdown, no code fences.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        "Compare the candidate profile against the job data and produce a match analysis.",
        "",
        "--- JOB DATA (JSON) ---",
        JSON.stringify(input.jobData).slice(0, 6_000),
        "--- CANDIDATE PROFILE (JSON) ---",
        JSON.stringify(input.parsedResume).slice(0, 6_000),
        "",
        "Rules:",
        '- "overallScore" is 0-100 (calibrated: 75+ strong, 50-74 moderate, below 50 weak).',
        '- "matchLabel" must be "strong", "moderate", or "weak" and agree with the score.',
        '- "missingSkills" lists skills the job wants that the resume does not evidence; each needs "priority" ("high"|"medium"|"low") and a short "reason".',
        '- "experienceAlignment" summarises the fit with concrete "strengths" and "gaps" arrays.',
        '- "improvementAreas" gives 2-4 actionable items, each with "title", "priority", "description", "suggestion".',
        "",
        'Reply with ONLY this JSON shape:',
        '{"overallScore":72,"matchLabel":"moderate","matchedSkills":["..."],"missingSkills":[{"skill":"...","priority":"high","reason":"..."}],"experienceAlignment":{"summary":"...","strengths":["..."],"gaps":["..."]},"improvementAreas":[{"title":"...","priority":"medium","description":"...","suggestion":"..."}]}',
      ].join("\n"),
    },
  ];
}
