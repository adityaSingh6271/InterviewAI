import type { ParsedResume } from "@/lib/types/jobInterview";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_KEYWORDS = [
  "javascript", "typescript", "python", "java", "go", "golang", "rust", "c++", "c#", "ruby", "swift", "kotlin",
  "react", "next.js", "vue", "angular", "node.js", "express", "django", "fastapi", "spring", "nestjs",
  "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb", "cassandra",
  "aws", "gcp", "azure", "kubernetes", "docker", "terraform",
  "kafka", "rabbitmq", "celery", "spark", "hadoop", "airflow",
  "graphql", "rest", "grpc", "microservices", "event-driven", "ci/cd",
  "machine learning", "deep learning", "pytorch", "tensorflow", "nlp",
  "figma", "sketch", "system design", "agile", "scrum", "tdd",
];

function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_KEYWORDS.filter((skill) => lower.includes(skill))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

function extractExperienceYears(text: string): number | undefined {
  // Look for "5 years of experience", "5+ years", etc.
  const match = text.match(/(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)/i);
  return match ? parseInt(match[1]) : undefined;
}

function extractCompanies(text: string): string[] {
  // Look for "at <Company>", "<Company> (20XX - 20XX)", etc.
  const results: string[] = [];
  const patterns = [
    /\bat\s+([A-Z][a-zA-Z0-9\s&.-]{1,25}?)(?:\s*[,(]|$)/gm,
    /([A-Z][a-zA-Z0-9&\s.-]{1,25})\s+\|?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})/gm,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const candidate = match[1].trim();
      if (candidate.length > 2 && !/^(the|a|an|this|our|my|we|us)$/i.test(candidate)) {
        results.push(candidate);
      }
    }
  }
  return [...new Set(results)].slice(0, 5);
}

function extractEducation(text: string): string[] {
  const results: string[] = [];
  const patterns = [
    /(?:B\.?S\.?|B\.?E\.?|B\.?Tech|Bachelor'?s?)\s+(?:in\s+)?([A-Za-z\s]+)/gi,
    /(?:M\.?S\.?|M\.?E\.?|M\.?Tech|Master'?s?)\s+(?:in\s+)?([A-Za-z\s]+)/gi,
    /(?:Ph\.?D|Doctorate)\s+(?:in\s+)?([A-Za-z\s]+)/gi,
    /(Computer Science|Software Engineering|Information Technology|Electrical Engineering|Mathematics|Statistics)/gi,
  ];
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      results.push(match[0].trim());
    }
  }
  return [...new Set(results)].slice(0, 3);
}

function extractCertifications(text: string): string[] {
  const certKeywords = ["AWS Certified", "Google Cloud", "CKA", "CKAD", "Azure", "PMP", "Scrum Master", "CEH", "CISSP", "Oracle", "Cisco"];
  const lower = text.toLowerCase();
  return certKeywords.filter((c) => lower.includes(c.toLowerCase()));
}

function extractProjects(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 20 && l.length < 200 && /(?:built|developed|designed|created|implemented|led|owned|architected|launched)/i.test(l))
    .slice(0, 5);
}

function extractAchievements(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 15 && /(?:\d+%|\d+x|reduced|improved|increased|saved|grew|scaled|delivered)/i.test(l))
    .slice(0, 4);
}

function extractName(text: string): string | undefined {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  // First 1-3 non-empty lines are often the name
  for (const line of lines.slice(0, 3)) {
    if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(line) && line.split(" ").length <= 4) {
      return line;
    }
  }
  return undefined;
}

function extractCurrentRole(text: string): string | undefined {
  const match = text.match(/(?:current(?:ly)?|present|now)\s*[-:]?\s*([A-Za-z\s]{5,50}?)(?:\s*at|,|\n|$)/i);
  if (match?.[1]) return match[1].trim();
  // First role-like line in the text
  const roleMatch = text.match(/(?:senior|junior|staff|lead|principal)?\s*(?:software|frontend|backend|full.stack|data|devops|ml|ai)?\s*(?:engineer|developer|architect|manager|designer|analyst|scientist)/i);
  return roleMatch?.[0]?.trim();
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Parses resume text into structured data.
 * Simulates AI-based parsing. Replace body with POST /api/parse-resume.
 */
export async function parseResume(resumeContent: string): Promise<ParsedResume> {
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));

  if (!resumeContent || resumeContent.trim().length < 50) {
    return {
      skills: [],
      technologies: [],
      education: [],
      certifications: [],
      projects: [],
      previousCompanies: [],
      achievements: [],
    };
  }

  const skills = extractSkillsFromText(resumeContent);
  const technologies = skills.filter((s) =>
    !["Agile", "Scrum", "Tdd", "Ci/cd", "Rest", "Graphql", "Microservices", "Event-driven"].includes(s)
  );

  return {
    candidateName: extractName(resumeContent),
    currentRole: extractCurrentRole(resumeContent),
    experienceYears: extractExperienceYears(resumeContent),
    skills,
    technologies,
    education: extractEducation(resumeContent),
    certifications: extractCertifications(resumeContent),
    projects: extractProjects(resumeContent),
    previousCompanies: extractCompanies(resumeContent),
    achievements: extractAchievements(resumeContent),
  };
}
