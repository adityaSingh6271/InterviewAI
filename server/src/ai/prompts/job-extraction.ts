import type { ChatMessage } from "../client";

/**
 * Job-description extraction prompt. The model turns raw JD text into the
 * structured `ExtractedJobData` shape the wizard persists; it only ever
 * produces content (no IDs, no tenancy - context comes from the draft row).
 */

export type JobExtractionInput = {
  jobDescription: string;
};

export function buildJobExtractionPrompt(input: JobExtractionInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are an expert recruiting analyst that structures job descriptions.",
        "You extract facts from the given text and never invent employers, skills, or requirements that are not implied by it.",
        "You reply with ONLY a JSON object - no prose, no markdown, no code fences.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        "Extract the structured job information from the job description below.",
        "",
        "--- JOB DESCRIPTION START ---",
        input.jobDescription.slice(0, 12_000),
        "--- JOB DESCRIPTION END ---",
        "",
        "Rules:",
        '- "roleTitle" is the headline role (e.g. "Senior Frontend Engineer").',
        '- "category" is one broad family such as "Engineering", "Data", "Product", "Design", "Marketing", "Sales", "HR", "Finance".',
        '- "seniority" and "experienceLevel" describe level (e.g. "Mid-Level", "Senior").',
        '- "requiredSkills"/"preferredSkills"/"technologies" are SHORT skill tokens (e.g. "React", "TypeScript", "SQL") - no sentences.',
        '- "responsibilities"/"qualifications" are concise bullet-length strings.',
        '- "sessionDurationMinutes" is a sensible interview length (15-180) for this role.',
        '- "extractionConfidence" is how well the text supports the extraction: "high", "medium", or "low".',
        "Omit optional fields you cannot infer; never leave placeholders or nulls.",
        "",
        'Reply with ONLY this JSON shape:',
        '{"roleTitle":"...","company":"...","category":"...","industry":"...","experienceLevel":"...","seniority":"...","requiredSkills":["..."],"preferredSkills":["..."],"responsibilities":["..."],"qualifications":["..."],"technologies":["..."],"inferredInterviewType":"...","sessionDurationMinutes":45,"extractionConfidence":"high|medium|low"}',
      ].join("\n"),
    },
  ];
}
