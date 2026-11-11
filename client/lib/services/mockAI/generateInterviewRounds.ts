import type {
  InterviewRound,
  RoundType,
} from "@/lib/types/jobInterview";

interface GenerateRoundsParams {
  role: string;
  category?: string;
  seniority?: string;
  industry?: string;
  jobDescription: string;
}

export async function generateInterviewRounds(
  params: GenerateRoundsParams
): Promise<InterviewRound[]> {
  // Simulate AI latency
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const { role, category = "Engineering", seniority = "Mid-Level" } = params;
  const lowerRole = role.toLowerCase();
  const lowerCat = category.toLowerCase();

  const isEngineering =
    lowerCat.includes("eng") ||
    lowerCat.includes("tech") ||
    lowerCat.includes("soft") ||
    lowerRole.includes("developer") ||
    lowerRole.includes("engineer") ||
    lowerRole.includes("frontend") ||
    lowerRole.includes("backend") ||
    lowerRole.includes("fullstack");

  const isSenior =
    seniority === "Senior" ||
    seniority === "Lead" ||
    seniority === "Staff" ||
    seniority === "Principal" ||
    lowerRole.includes("lead") ||
    lowerRole.includes("senior") ||
    lowerRole.includes("architect");

  const isProductOrDesign =
    lowerCat.includes("design") ||
    lowerCat.includes("product") ||
    lowerRole.includes("ux") ||
    lowerRole.includes("ui") ||
    lowerRole.includes("product manager");

  const isDataOrAI =
    lowerCat.includes("data") ||
    lowerRole.includes("data") ||
    lowerRole.includes("machine learning") ||
    lowerRole.includes("ai");

  const rounds: InterviewRound[] = [];

  if (isEngineering) {
    rounds.push({
      id: "round_1",
      order: 1,
      type: "technical" as RoundType,
      title: "Core Technical & Architecture Screen",
      description: `Evaluate core fundamentals, programming paradigms, and framework expertise relevant to ${role}.`,
      estimatedDurationMinutes: 30,
      status: "not_started",
      attempts: 0,
    });

    rounds.push({
      id: "round_2",
      order: 2,
      type: "coding" as RoundType,
      title: "Hands-on Live Coding & Problem Solving",
      description: `Algorithm design, clean code practices, edge-case handling, and algorithmic complexity analysis.`,
      estimatedDurationMinutes: 45,
      status: "not_started",
      attempts: 0,
    });

    if (isSenior) {
      rounds.push({
        id: "round_3",
        order: 3,
        type: "system_design" as RoundType,
        title: "Large-scale System Architecture & Design",
        description: `Design distributed systems, discuss caching, scalability, fault tolerance, and trade-offs.`,
        estimatedDurationMinutes: 45,
        status: "not_started",
        attempts: 0,
      });
    }

    rounds.push({
      id: isSenior ? "round_4" : "round_3",
      order: isSenior ? 4 : 3,
      type: "behavioral" as RoundType,
      title: "Leadership, Collaboration & Culture Fit",
      description: `Assess communication, past conflict resolution, stakeholder handling, and ownership via STAR format.`,
      estimatedDurationMinutes: 30,
      status: "not_started",
      attempts: 0,
    });

    rounds.push({
      id: isSenior ? "round_5" : "round_4",
      order: isSenior ? 5 : 4,
      type: "hr" as RoundType,
      title: "Final HR, Values & Compensation Alignment",
      description: `Discussion regarding company culture, career aspirations, logistics, and expectation alignment.`,
      estimatedDurationMinutes: 20,
      status: "not_started",
      attempts: 0,
    });
  } else if (isProductOrDesign) {
    rounds.push({
      id: "round_1",
      order: 1,
      type: "portfolio" as RoundType,
      title: "Deep-Dive Portfolio & Case Walkthrough",
      description: `Detailed review of past deliverables, design systems, trade-offs, and metrics impact.`,
      estimatedDurationMinutes: 40,
      status: "not_started",
      attempts: 0,
    });

    rounds.push({
      id: "round_2",
      order: 2,
      type: "case_study" as RoundType,
      title: "Product Discovery & Whiteboard Challenge",
      description: `Live problem formulation, user empathy mapping, wireframing, and prioritization exercise.`,
      estimatedDurationMinutes: 45,
      status: "not_started",
      attempts: 0,
    });

    rounds.push({
      id: "round_3",
      order: 3,
      type: "behavioral" as RoundType,
      title: "Stakeholder Alignment & Behavioral Fit",
      description: `Handling pushback, working with engineering/marketing, and cross-functional leadership.`,
      estimatedDurationMinutes: 30,
      status: "not_started",
      attempts: 0,
    });
  } else if (isDataOrAI) {
    rounds.push({
      id: "round_1",
      order: 1,
      type: "technical" as RoundType,
      title: "Data Modeling, Math & ML Concepts",
      description: `Statistics, feature engineering, loss functions, and ML lifecycle questions.`,
      estimatedDurationMinutes: 35,
      status: "not_started",
      attempts: 0,
    });

    rounds.push({
      id: "round_2",
      order: 2,
      type: "coding" as RoundType,
      title: "Data Pipelines & Applied Coding",
      description: `Data transformation, SQL/Python data structures, optimization, and pipeline robustness.`,
      estimatedDurationMinutes: 45,
      status: "not_started",
      attempts: 0,
    });

    rounds.push({
      id: "round_3",
      order: 3,
      type: "system_design" as RoundType,
      title: "MLOps & Scalable Data Architecture",
      description: `Model serving, monitoring data drift, latency, caching, and stream processing.`,
      estimatedDurationMinutes: 40,
      status: "not_started",
      attempts: 0,
    });

    rounds.push({
      id: "round_4",
      order: 4,
      type: "behavioral" as RoundType,
      title: "Business Impact & Collaboration",
      description: `Translating raw data into business outcomes, communication with non-technical stakeholders.`,
      estimatedDurationMinutes: 25,
      status: "not_started",
      attempts: 0,
    });
  } else {
    // Generic robust interview plan
    rounds.push({
      id: "round_1",
      order: 1,
      type: "technical" as RoundType,
      title: "Domain Knowledge & Core Competencies",
      description: `Evaluate industry expertise, relevant tools, and methodologies required for ${role}.`,
      estimatedDurationMinutes: 30,
      status: "not_started",
      attempts: 0,
    });

    rounds.push({
      id: "round_2",
      order: 2,
      type: "case_study" as RoundType,
      title: "Practical Scenario & Problem-Solving",
      description: `Assess real-time critical thinking, prioritization, and domain-specific challenges.`,
      estimatedDurationMinutes: 40,
      status: "not_started",
      attempts: 0,
    });

    rounds.push({
      id: "round_3",
      order: 3,
      type: "behavioral" as RoundType,
      title: "Behavioral & Situational Interview",
      description: `Evaluate teamwork, past achievements, conflict resolution, and communication skills.`,
      estimatedDurationMinutes: 30,
      status: "not_started",
      attempts: 0,
    });

    rounds.push({
      id: "round_4",
      order: 4,
      type: "hr" as RoundType,
      title: "Culture Fit & Next Steps",
      description: `Values alignment, career motivations, timeline, and candidate questions.`,
      estimatedDurationMinutes: 20,
      status: "not_started",
      attempts: 0,
    });
  }

  return rounds;
}
