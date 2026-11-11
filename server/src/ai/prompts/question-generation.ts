import type { ChatMessage } from "../client";

/**
 * Question generation prompt. Context comes from server-resolved rows only -
 * the model never receives IDs, names, or anything tenant-identifying beyond
 * the interview's own content, and it only ever produces text content.
 */

export type QuestionGenerationInput = {
  interview: {
    title: string;
    description: string | null;
    jobRequirements: string | null;
  };
  round?: { name: string; roundType: string };
  count: number;
  difficulty?: string;
  topics?: string;
};

export function buildQuestionGenerationPrompt(
  input: QuestionGenerationInput,
): ChatMessage[] {
  const context = [
    `Interview: ${input.interview.title}`,
    input.interview.description ? `Description: ${input.interview.description}` : null,
    input.interview.jobRequirements
      ? `Job requirements: ${input.interview.jobRequirements}`
      : null,
    input.round ? `Round: ${input.round.name} (type: ${input.round.roundType})` : null,
    input.topics ? `Focus topics: ${input.topics}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const difficultyRule = input.difficulty
    ? `- Every question must have "difficulty" set to exactly "${input.difficulty}".`
    : `- Vary "difficulty" across "${["EASY", "MEDIUM", "HARD"].join('", "')}" where it fits the role.`;

  return [
    {
      role: "system",
      content: [
        "You are an expert technical interviewer designing questions for a structured job interview.",
        "You write precise, self-contained, unbiased questions a candidate can answer without extra context.",
        "You reply with ONLY a JSON object - no prose, no markdown, no code fences.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Create exactly ${input.count} interview question${input.count === 1 ? "" : "s"} for the context below.`,
        "",
        context,
        "",
        "Rules:",
        "- Each question must be self-contained and answerable in 1-3 minutes.",
        "- Do not embed the answer or expected keywords inside the question text.",
        "- No two questions may repeat or overlap in substance.",
        "- Match the questions to the role seniority implied by the context.",
        difficultyRule,
        '- "expectedKeywords" holds 3-8 short phrases (max 120 chars each) an evaluator can check an answer against.',
        "",
        `Reply with ONLY this JSON shape:`,
        `{"questions":[{"prompt":"...","expectedKeywords":["..."],"difficulty":"EASY|MEDIUM|HARD"}]}`,
      ].join("\n"),
    },
  ];
}
