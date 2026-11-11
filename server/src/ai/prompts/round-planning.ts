import type { ChatMessage } from "../client";

/**
 * Interview-round planning prompt. The model proposes the wizard's round
 * plan from the extracted job data. Round `type` values are the UI's
 * vocabulary - the client mapper translates them to server round types at
 * publish time.
 */

export type RoundPlanningInput = {
  jobData: Record<string, unknown>;
  count: number;
};

/** The client-vocabulary round types the wizard UI understands. */
export const WIZARD_ROUND_TYPES = [
  "technical",
  "coding",
  "system_design",
  "behavioral",
  "hr",
  "portfolio",
  "case_study",
] as const;

export function buildRoundPlanningPrompt(input: RoundPlanningInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are an expert interview architect that designs balanced interview loops.",
        "You tailor the loop to the role's seniority, category, and requirements.",
        "You reply with ONLY a JSON object - no prose, no markdown, no code fences.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Design an interview loop of exactly ${input.count} rounds for the job data below.`,
        "",
        "--- JOB DATA (JSON) ---",
        JSON.stringify(input.jobData).slice(0, 6_000),
        "",
        "Rules:",
        `- Each round's "type" must be one of: ${WIZARD_ROUND_TYPES.map((t) => `"${t}"`).join(", ")}.`,
        "- Order the loop from hardest signal to closing round; no two rounds cover the same ground.",
        '- "title" is a concise round name; "description" is 1-2 sentences on what the round evaluates.',
        '- "estimatedDurationMinutes" is a realistic length (10-120) for the round.',
        "",
        'Reply with ONLY this JSON shape:',
        '{"rounds":[{"type":"technical","title":"...","description":"...","estimatedDurationMinutes":30}]}',
      ].join("\n"),
    },
  ];
}
