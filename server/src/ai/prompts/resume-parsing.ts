import type { ChatMessage } from "../client";

/**
 * Resume parsing prompt. The model turns extracted resume text into the
 * structured `ParsedResume` shape the wizard persists alongside the match
 * analysis. It never sees file bytes - only the capped text.
 */

export type ResumeParsingInput = {
  resumeText: string;
};

export function buildResumeParsingPrompt(input: ResumeParsingInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are an expert technical recruiter that parses resumes into structured profiles.",
        "You extract facts from the given text and never invent employers, degrees, or skills that are not present.",
        "You reply with ONLY a JSON object - no prose, no markdown, no code fences.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        "Parse the resume text below into a structured candidate profile.",
        "",
        "--- RESUME START ---",
        input.resumeText.slice(0, 12_000),
        "--- RESUME END ---",
        "",
        "Rules:",
        '- "skills" holds SHORT capability tokens (e.g. "React", "System Design", "Agile").',
        '- "technologies" holds concrete tools/languages/frameworks (e.g. "TypeScript", "PostgreSQL", "AWS").',
        '- "experienceYears" is the total years of professional experience you can infer (number; omit if unknown).',
        "- Arrays you cannot fill are omitted or empty - never padded with guesses.",
        "",
        'Reply with ONLY this JSON shape:',
        '{"candidateName":"...","currentRole":"...","experienceYears":5,"skills":["..."],"technologies":["..."],"education":["..."],"certifications":["..."],"projects":["..."],"previousCompanies":["..."],"achievements":["..."]}',
      ].join("\n"),
    },
  ];
}
