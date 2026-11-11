import type { ChatMessage } from "../client";

/**
 * Answer evaluation prompt - the rubric that produces `responses.ai_score`
 * and `responses.ai_feedback`. The rubric is fixed server-side; the model
 * only fills in the numbers and text.
 */

export type AnswerEvaluationInput = {
  question: {
    prompt: string;
    expectedKeywords: string[] | null;
    difficulty: string;
  };
  transcript: string | null;
};

export function isUnansweredTranscript(transcript: string | null | undefined): boolean {
  const trimmed = (transcript ?? "").trim();
  if (!trimmed) return true;
  return /^(not answered|no answered|no answer( provided)?|skipped)$/i.test(trimmed);
}

export function buildAnswerEvaluationPrompt(input: AnswerEvaluationInput): ChatMessage[] {
  const keywords =
    input.question.expectedKeywords && input.question.expectedKeywords.length > 0
      ? input.question.expectedKeywords.join(", ")
      : "(none provided - judge on correctness and completeness)";
  const transcript = !isUnansweredTranscript(input.transcript)
    ? (input.transcript as string)
    : "(the candidate submitted no answer)";

  return [
    {
      role: "system",
      content: [
        "You are a strict, consistent interview evaluator scoring one answer to one question.",
        "You judge only what is in the transcript - never invent content the candidate did not write.",
        "You reply with ONLY a JSON object - no prose, no markdown, no code fences.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Question (difficulty ${input.question.difficulty}):`,
        input.question.prompt,
        "",
        `Expected keywords: ${keywords}`,
        "",
        "Candidate answer:",
        transcript,
        "",
        "Scoring rubric (0-100):",
        "- Keyword/concept coverage: up to 40 points.",
        "- Technical correctness: up to 40 points.",
        "- Completeness and clarity: up to 20 points.",
        "- An empty or off-topic answer scores 0-15.",
        "",
        "Rules:",
        '- "score" is a number from 0 to 100.',
        '- "feedback" is 1-3 plain sentences (max 500 characters) saying what was right and what to improve.',
        '- "keywordHits" lists the expected keywords the answer actually covered.',
        "",
        `Reply with ONLY this JSON shape:`,
        `{"score":0,"feedback":"...","keywordHits":["..."]}`,
      ].join("\n"),
    },
  ];
}
