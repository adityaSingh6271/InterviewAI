import type { ChatMessage } from "../client";

/**
 * Interview description drafting - an admin aid. The output is a preview:
 * it is never written to the database by the AI layer (the admin saves it
 * through the normal `PATCH /interviews/:id`).
 */

export type DescriptionDraftingInput = {
  title: string;
  existingDescription?: string | null;
  focus?: string;
};

export function buildDescriptionPrompt(input: DescriptionDraftingInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are a talent partner writing clear, concrete job interview briefs.",
        "You write in plain professional English, free of buzzwords and legal boilerplate.",
        "You reply with ONLY a JSON object - no prose, no markdown, no code fences.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Draft an interview description and job requirements for: ${input.title}`,
        input.existingDescription
          ? `Current description (improve on it): ${input.existingDescription}`
          : null,
        input.focus ? `Additional focus from the interviewer: ${input.focus}` : null,
        input.existingDescription
          ? "Rewrite both fields so they are sharper and more specific than the current text."
          : "Write both fields from scratch.",
        "",
        "Rules:",
        '- "description" is 2-4 sentences (max 4000 chars) describing what this interview covers.',
        '- "jobRequirements" is a short plain-text list (max 8000 chars), one requirement per line.',
        '- Base everything on the title provided - do not invent a different role.',
        "",
        `Reply with ONLY this JSON shape:`,
        `{"description":"...","jobRequirements":"..."}`,
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
    },
  ];
}
