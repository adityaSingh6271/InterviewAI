import type {
  ExtractedJobData,
  ExtractionConfidence,
} from "@/lib/types/jobInterview";

// ─── Keyword Dictionaries ─────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Backend Engineering": [
    "backend", "server", "api", "rest", "graphql", "microservice",
    "node.js", "python", "java", "go", "golang", "rust", "ruby",
    "django", "fastapi", "spring", "express", "nestjs",
    "database", "postgresql", "mysql", "mongodb", "redis",
    "kafka", "rabbitmq", "message queue", "distributed systems",
  ],
  "Frontend Engineering": [
    "frontend", "front-end", "ui", "ux", "react", "vue", "angular",
    "next.js", "nuxt", "svelte", "html", "css", "typescript", "javascript",
    "tailwind", "sass", "webpack", "vite", "responsive", "web performance",
    "browser", "accessibility", "a11y", "design system",
  ],
  "Full-Stack Engineering": [
    "full stack", "full-stack", "fullstack", "both frontend and backend",
    "end-to-end", "mean stack", "mern stack",
  ],
  "Mobile Engineering": [
    "android", "ios", "mobile", "react native", "flutter", "swift",
    "kotlin", "objective-c", "xamarin",
  ],
  "DevOps / Platform": [
    "devops", "platform", "infrastructure", "kubernetes", "k8s",
    "docker", "terraform", "ansible", "ci/cd", "jenkins", "github actions",
    "aws", "gcp", "azure", "cloud", "sre", "reliability", "observability",
    "monitoring", "prometheus", "grafana",
  ],
  "Data Engineering": [
    "data engineer", "etl", "pipeline", "spark", "hadoop", "airflow",
    "dbt", "snowflake", "bigquery", "data warehouse", "data lake",
    "databricks", "flink",
  ],
  "Machine Learning / AI": [
    "machine learning", "ml", "ai", "deep learning", "neural network",
    "tensorflow", "pytorch", "nlp", "computer vision", "llm",
    "generative ai", "model training", "data scientist", "mlops",
  ],
  "System Design": [
    "distributed", "system design", "architecture", "scalable",
    "high availability", "fault tolerant", "load balancing",
    "caching", "cdn", "sharding",
  ],
  "Product Management": [
    "product manager", "product management", "roadmap", "stakeholder",
    "customer discovery", "okr", "kpi", "go-to-market", "gtm",
  ],
  "Design / UX": [
    "designer", "product design", "ux", "user experience", "figma",
    "sketch", "wireframe", "prototype", "design thinking", "usability",
  ],
};

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  FinTech: ["fintech", "payment", "banking", "finance", "financial", "stripe", "paypal", "plaid", "ledger", "transaction", "fraud", "compliance"],
  "E-Commerce": ["ecommerce", "e-commerce", "marketplace", "shopify", "retail", "cart", "inventory", "checkout"],
  HealthTech: ["health", "medical", "healthcare", "clinical", "ehr", "hipaa", "patient", "hospital"],
  EdTech: ["education", "learning", "edtech", "lms", "course", "student", "teacher", "curriculum"],
  SaaS: ["saas", "b2b", "enterprise", "subscription", "multi-tenant", "platform"],
  Gaming: ["gaming", "game", "unity", "unreal", "multiplayer", "real-time"],
  "AI / ML": ["artificial intelligence", "machine learning", "llm", "openai", "anthropic"],
  Social: ["social", "community", "network", "content", "feed", "user-generated"],
  Security: ["security", "cybersecurity", "infosec", "soc", "siem", "zero trust", "devsecops"],
};

const SENIORITY_KEYWORDS: Record<string, string[]> = {
  "Entry-Level": ["entry", "junior", "associate", "fresh", "0-2 years", "graduate"],
  "Mid-Level": ["mid", "mid-level", "3-5 years", "intermediate", "experienced"],
  "Senior": ["senior", "5+ years", "sr.", "5 years", "6 years", "7 years", "8 years"],
  "Staff": ["staff", "9+ years", "10 years", "principal", "lead", "tech lead"],
  "Principal / Distinguished": ["principal", "distinguished", "fellow", "architect"],
  "Manager": ["manager", "engineering manager", "em", "director", "head of"],
};

const COMMON_SKILLS: Record<string, string[]> = {
  languages: ["javascript", "typescript", "python", "java", "go", "golang", "rust", "c++", "c#", "ruby", "swift", "kotlin", "scala"],
  frameworks: ["react", "next.js", "vue", "angular", "node.js", "express", "django", "fastapi", "spring", "nestjs", "flask", "rails"],
  databases: ["postgresql", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb", "cassandra", "sqlite", "neo4j"],
  cloud: ["aws", "gcp", "azure", "kubernetes", "docker", "terraform", "serverless"],
  data: ["kafka", "rabbitmq", "celery", "spark", "hadoop", "airflow", "dbt"],
  testing: ["jest", "cypress", "playwright", "pytest", "junit", "selenium"],
  practices: ["microservices", "ci/cd", "agile", "scrum", "tdd", "ddd", "event-driven", "rest api", "graphql", "grpc"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase();
}

function matchKeywords(text: string, keywords: string[]): boolean {
  const lower = normalize(text);
  return keywords.some((kw) => lower.includes(normalize(kw)));
}

function extractCategory(jd: string): string | undefined {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (matchKeywords(jd, keywords)) return category;
  }
  return undefined;
}

function extractIndustry(jd: string): string | undefined {
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (matchKeywords(jd, keywords)) return industry;
  }
  return undefined;
}

function extractSeniority(jd: string): { level: string; experience: string } | undefined {
  for (const [level, keywords] of Object.entries(SENIORITY_KEYWORDS)) {
    if (matchKeywords(jd, keywords)) {
      const expMatch = jd.match(/(\d+)\+?\s*years?/i);
      return {
        level,
        experience: expMatch ? `${expMatch[1]}+ years` : level,
      };
    }
  }
  return undefined;
}

function extractCompany(jd: string): string | undefined {
  // Common patterns: "at CompanyName", "Company: CompanyName", "join CompanyName"
  const patterns = [
    /\bat\s+([A-Z][a-zA-Z0-9\s&.-]{1,30}?)(?:\s*[,.\n]|$)/m,
    /Company:\s*([A-Za-z0-9\s&.-]{2,30}?)(?:\s*[,.\n]|$)/im,
    /join\s+([A-Z][a-zA-Z0-9\s&.-]{1,25}?)(?:\s*[,.\n]|$)/m,
    /^([A-Z][a-zA-Z0-9\s&.-]{1,30}?)\s+is\s+(?:looking|hiring|seeking)/m,
  ];
  for (const pattern of patterns) {
    const match = jd.match(pattern);
    if (match?.[1]) {
      const candidate = match[1].trim();
      // Filter out generic words
      if (!/^(we|our|the|a|an|this|that|us|team|company|organization)$/i.test(candidate)) {
        return candidate.replace(/\s+/g, " ").trim();
      }
    }
  }
  return undefined;
}

function extractRole(jd: string): string | undefined {
  // Try first lines, common patterns
  const lines = jd.split("\n").map((l) => l.trim()).filter(Boolean);
  
  // First line is often the role
  if (lines[0] && lines[0].length < 80) {
    const firstLine = lines[0];
    // Check it looks like a role (not a company name or generic header)
    if (/engineer|developer|manager|designer|architect|analyst|scientist|lead|director/i.test(firstLine)) {
      return firstLine;
    }
  }

  // Role title patterns in JD body
  const patterns = [
    /(?:position|role|title|opening):\s*([^\n]{5,60})/i,
    /(?:looking for|hiring|seeking)\s+(?:a|an)\s+([^\n,]{5,60})/i,
    /^((?:senior|junior|staff|lead|principal|mid-level)?\s*[a-z\s]+(?:engineer|developer|manager|designer|architect|analyst|scientist))/im,
  ];
  for (const pattern of patterns) {
    const match = jd.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return undefined;
}

function extractSkills(jd: string): { required: string[]; preferred: string[]; technologies: string[] } {
  const lower = normalize(jd);
  const required: string[] = [];
  const preferred: string[] = [];
  const technologies: string[] = [];

  // Identify required vs preferred sections
  const requiredSection = jd.match(/(?:required|must have|requirements)[^\n]*\n([\s\S]*?)(?:\n\n|preferred|nice to have|bonus|$)/i)?.[1] ?? jd;
  const preferredSection = jd.match(/(?:preferred|nice to have|bonus|plus)[^\n]*\n([\s\S]*?)(?:\n\n|$)/i)?.[1] ?? "";

  const requiredLower = normalize(requiredSection);
  const preferredLower = normalize(preferredSection);

  for (const [, skills] of Object.entries(COMMON_SKILLS)) {
    for (const skill of skills) {
      if (requiredLower.includes(skill)) {
        const display = skill.charAt(0).toUpperCase() + skill.slice(1);
        if (!required.includes(display)) required.push(display);
        if (!technologies.includes(display) && !["microservices", "ci/cd", "agile", "scrum", "tdd", "ddd", "event-driven", "rest api", "graphql", "grpc"].includes(skill)) {
          technologies.push(display);
        }
      } else if (preferredLower.includes(skill) || lower.includes(skill)) {
        const display = skill.charAt(0).toUpperCase() + skill.slice(1);
        if (!preferred.includes(display) && !required.includes(display)) preferred.push(display);
      }
    }
  }

  return { required: required.slice(0, 12), preferred: preferred.slice(0, 8), technologies: technologies.slice(0, 10) };
}

function extractDuration(jd: string): number {
  const match = jd.match(/(\d+)\s*(?:minute|min|hour|hr)/i);
  if (match) {
    const val = parseInt(match[1]);
    if (jd.toLowerCase().includes("hour")) return val * 60;
    return val;
  }
  // Default based on seniority
  const seniority = extractSeniority(jd);
  if (!seniority) return 30;
  if (["Staff", "Principal / Distinguished", "Manager"].includes(seniority.level)) return 60;
  if (seniority.level === "Senior") return 45;
  return 30;
}

function inferInterviewType(category?: string): string {
  if (!category) return "Technical";
  if (category.includes("Backend") || category.includes("Full-Stack")) return "Technical + System Design";
  if (category.includes("Frontend")) return "Technical + Coding";
  if (category.includes("DevOps")) return "Technical + Infrastructure";
  if (category.includes("Data Engineering")) return "Technical + Data";
  if (category.includes("ML") || category.includes("AI")) return "Technical + ML";
  if (category.includes("Product")) return "Product + Behavioral";
  if (category.includes("Design")) return "Portfolio + Design Thinking";
  if (category.includes("Manager")) return "Leadership + Behavioral";
  return "Technical";
}

function computeConfidence(
  role?: string,
  category?: string,
  skills?: string[],
  company?: string
): ExtractionConfidence {
  let score = 0;
  if (role) score += 2;
  if (category) score += 2;
  if (skills && skills.length > 3) score += 2;
  if (company) score += 1;
  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Extracts structured job information from a raw job description string.
 * Simulates AI-based extraction using keyword matching.
 * Architecture: replace this function body with a POST /api/extract-jd call.
 */
export async function extractJobData(jobDescription: string): Promise<ExtractedJobData> {
  // Simulate network/AI latency
  await new Promise((r) => setTimeout(r, 1400 + Math.random() * 600));

  if (!jobDescription || jobDescription.trim().length < 30) {
    return {
      roleTitle: "",
      extractionConfidence: "low",
      requiredSkills: [],
      preferredSkills: [],
      responsibilities: [],
      qualifications: [],
      technologies: [],
    };
  }

  const role = extractRole(jobDescription);
  const company = extractCompany(jobDescription);
  const category = extractCategory(jobDescription);
  const industry = extractIndustry(jobDescription);
  const seniority = extractSeniority(jobDescription);
  const { required, preferred, technologies } = extractSkills(jobDescription);
  const duration = extractDuration(jobDescription);
  const confidence = computeConfidence(role, category, required, company);

  // Extract responsibilities (lines with action verbs in the JD)
  const responsibilities = jobDescription
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 20 && l.length < 150 && /^[A-Z]/.test(l) && /(?:build|design|develop|maintain|lead|own|collaborate|work|create|implement|ensure|drive|manage)/i.test(l))
    .slice(0, 6);

  const qualifications = jobDescription
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 15 && l.length < 150 && /(?:degree|bachelor|master|years? of experience|\d\+\s*years?|experience with|proficiency|knowledge of|familiarity)/i.test(l))
    .slice(0, 5);

  return {
    roleTitle: role ?? "",
    company,
    category,
    industry,
    experienceLevel: seniority?.experience,
    seniority: seniority?.level,
    requiredSkills: required,
    preferredSkills: preferred,
    responsibilities,
    qualifications,
    technologies,
    inferredInterviewType: inferInterviewType(category),
    sessionDurationMinutes: duration,
    extractionConfidence: confidence,
  };
}
