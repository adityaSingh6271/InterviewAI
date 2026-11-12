"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type {
  ExtractedJobData,
  ParsedResume,
  ResumeMatchAnalysis,
  InterviewRound,
  ResumeReference,
} from "@/lib/types/jobInterview";
import {
  extractJobData,
  parseResume,
  analyzeResumeMatch,
  generateInterviewRounds,
} from "@/lib/services/mockAI";
import { getErrorMessage, isApiError } from "@/lib/api/errors";
import {
  AI_NOT_CONFIGURED_CODE,
  interviewsApi,
  type ServerWizardAnalysis,
  type UpdateInterviewPayload,
} from "@/lib/api/interviews";
import { queryKeys } from "@/lib/api/queryKeys";
import {
  toCreatePayload,
  toDraftCreatePayload,
  toRoundPayload,
  toUpdatePayload,
} from "@/lib/mappers/interview.mapper";
import toast from "react-hot-toast";

export type WizardStep = 1 | 2 | 3 | 4;

/** Compact requirements summary for the `jobRequirements` column. */
function buildRequirementLines(data: ExtractedJobData): string {
  const lines: string[] = [];
  if (data.requiredSkills.length > 0) {
    lines.push(`Required skills: ${data.requiredSkills.join(", ")}`);
  }
  if (data.preferredSkills.length > 0) {
    lines.push(`Preferred skills: ${data.preferredSkills.join(", ")}`);
  }
  if (data.qualifications.length > 0) {
    lines.push(`Qualifications: ${data.qualifications.join("; ")}`);
  }
  if (data.technologies.length > 0) {
    lines.push(`Technologies: ${data.technologies.join(", ")}`);
  }
  return lines.join("\n");
}

export function useJobInterviewCreation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Step 1: JD
  const [jobDescription, setJobDescription] = useState("");

  // Step 2: Resume
  const [resumeRef, setResumeRef] = useState<ResumeReference | null>(null);

  // Step 3: AI Analysis results & editable overrides
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<string>("");
  const [extractedData, setExtractedData] = useState<ExtractedJobData | null>(null);
  const [parsedResumeData, setParsedResumeData] = useState<ParsedResume | null>(null);
  const [matchAnalysis, setMatchAnalysis] = useState<ResumeMatchAnalysis | null>(null);
  const [generatedRounds, setGeneratedRounds] = useState<InterviewRound[]>([]);

  // Overrides / Form fields
  const [roleTitle, setRoleTitle] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("Engineering");
  const [industry, setIndustry] = useState("Technology");
  const [experienceLevel, setExperienceLevel] = useState("Mid-Level");
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(30);

  // Is Submitting / Saving a wizard step
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingStep, setIsSavingStep] = useState(false);

  /**
   * Server-side draft: created when the wizard leaves step 1, PATCHed on
   * every later step, published (DRAFT -> ACTIVE) by the final submit.
   * A ref (not state) keeps it readable from every async step save without
   * re-render races.
   */
  const draftIdRef = useRef<string | null>(null);

  /** PATCH the draft. A failed step save warns but never blocks the wizard. */
  const persistStep = async (payload: UpdateInterviewPayload): Promise<boolean> => {
    const draftId = draftIdRef.current;
    if (!draftId) return false;
    try {
      await interviewsApi.update(draftId, payload);
      return true;
    } catch (err) {
      console.error("Wizard step save failed:", err);
      toast.error("Couldn't save your progress to the server - changes are kept locally.");
      return false;
    }
  };

  /** First save (step 1 -> 2): create the DRAFT row holding the JD. */
  const ensureDraft = async (): Promise<void> => {
    if (draftIdRef.current) return;
    try {
      const { data } = await interviewsApi.create(toDraftCreatePayload(jobDescription));
      draftIdRef.current = data.id;
    } catch (err) {
      console.error("Draft creation failed:", err);
      toast.error("Couldn't create the draft - you can still finish the wizard.");
    }
  };

  // Run AI analysis pipeline: the server's real LLM pipeline against the
  // draft row's own content, with the local heuristics as a fallback when
  // the institute has no active LLM config (or no draft exists).
  const runAnalysis = async (): Promise<boolean> => {
    if (isAnalyzing) return false;
    if (!jobDescription || jobDescription.trim().length < 30) {
      toast.error("Please provide a valid job description (min 30 characters).");
      return false;
    }

    setIsAnalyzing(true);
    try {
      const draftId = draftIdRef.current;
      if (draftId) {
        try {
          setAnalysisPhase("Analyzing job description, resume fit & round plan...");
          const { data } = await interviewsApi.analyzeDraft(draftId);
          await applyServerAnalysis(data);
          toast.success("AI analysis complete!");
          return true;
        } catch (err) {
          if (isApiError(err) && err.code === AI_NOT_CONFIGURED_CODE) {
            toast("AI isn't configured for your institute yet - using offline heuristics.", {
              icon: "ℹ️",
            });
          } else {
            console.error("Server analysis failed:", err);
            toast.error("Server analysis failed - using offline heuristics.");
          }
        }
      }
      // Heuristic fallback: no draft (all step saves failed) or the server
      // pipeline was unavailable - the wizard stays fully usable either way.
      return runHeuristicAnalysis();
    } finally {
      setIsAnalyzing(false);
      setAnalysisPhase("");
    }
  };

  /** Apply a server analysis response to the wizard state and persist it. */
  const applyServerAnalysis = async (data: ServerWizardAnalysis): Promise<void> => {
    const jobData = data.extractedJobData;
    setExtractedData(jobData);
    setParsedResumeData(data.parsedResume);
    setMatchAnalysis(data.matchAnalysis);
    setGeneratedRounds(
      data.rounds.map((round, index) => ({
        id: `round_${index + 1}`,
        type: round.type,
        title: round.title,
        description: round.description,
        estimatedDurationMinutes: round.estimatedDurationMinutes,
        order: round.order,
        status: "not_started",
        attempts: 0,
      })),
    );

    // Populate form fields (same mapping the heuristic path always did).
    const savedRole = jobData.roleTitle || "Software Engineer";
    const savedCompany = jobData.company || "";
    setRoleTitle(savedRole);
    setCompany(savedCompany);
    if (jobData.category) setCategory(jobData.category);
    if (jobData.industry) setIndustry(jobData.industry);
    if (jobData.experienceLevel) setExperienceLevel(jobData.experienceLevel);
    if (jobData.sessionDurationMinutes) setSessionDurationMinutes(jobData.sessionDurationMinutes);

    await persistStep({
      ...toUpdatePayload({
        targetRole: savedRole,
        company: savedCompany,
        category: jobData.category ?? category,
        industry: jobData.industry ?? industry,
        experienceLevel: jobData.experienceLevel ?? experienceLevel,
        sessionDurationMinutes: jobData.sessionDurationMinutes ?? sessionDurationMinutes,
        extractedJobData: jobData,
        ...(data.matchAnalysis ? { matchAnalysis: data.matchAnalysis } : {}),
      }),
      jobRequirements: buildRequirementLines(jobData),
    });
  };

  /** Local heuristic pipeline (mockAI) - the no-LLM-config fallback. */
  const runHeuristicAnalysis = async (): Promise<boolean> => {
    try {
      setAnalysisPhase("Analyzing Job Description & Extracting Requirements...");
      const jobData = await extractJobData(jobDescription);
      setExtractedData(jobData);

      // Populate form fields
      const savedRole = jobData.roleTitle || "Software Engineer";
      const savedCompany = jobData.company || "";
      setRoleTitle(savedRole);
      setCompany(savedCompany);
      if (jobData.category) setCategory(jobData.category);
      if (jobData.industry) setIndustry(jobData.industry);
      if (jobData.experienceLevel) setExperienceLevel(jobData.experienceLevel);
      if (jobData.sessionDurationMinutes) setSessionDurationMinutes(jobData.sessionDurationMinutes);

      let parsedResumeResult: ParsedResume | null = null;
      let matchResult: ResumeMatchAnalysis | null = null;
      if (resumeRef && resumeRef.content) {
        setAnalysisPhase("Parsing Resume & Extracting Candidate Profile...");
        parsedResumeResult = await parseResume(resumeRef.content);
        setParsedResumeData(parsedResumeResult);

        setAnalysisPhase("Running Match Analysis & Identifying Skill Gaps...");
        matchResult = await analyzeResumeMatch({
          jobData,
          parsedResume: parsedResumeResult,
        });
        setMatchAnalysis(matchResult);
      }

      setAnalysisPhase("Synthesizing Customized Interview Rounds...");
      const rounds = await generateInterviewRounds({
        role: jobData.roleTitle,
        category: jobData.category,
        seniority: jobData.seniority,
        industry: jobData.industry,
        jobDescription,
      });
      setGeneratedRounds(rounds);

      // Per-step save: the analysis artifacts land server-side right after
      // they are produced (same values the UI just received).
      await persistStep({
        ...toUpdatePayload({
          targetRole: savedRole,
          company: savedCompany,
          category: jobData.category ?? category,
          industry: jobData.industry ?? industry,
          experienceLevel: jobData.experienceLevel ?? experienceLevel,
          sessionDurationMinutes: jobData.sessionDurationMinutes ?? sessionDurationMinutes,
          extractedJobData: jobData,
          ...(matchResult ? { matchAnalysis: matchResult } : {}),
        }),
        jobRequirements: buildRequirementLines(jobData),
      });

      return true;
    } catch (err) {
      console.error("Heuristic analysis error:", err);
      toast.error("An error occurred during AI analysis. Using fallback data.");
      return false;
    }
  };

  const goToStep = async (step: WizardStep) => {
    if (isSavingStep || isAnalyzing || isCreating) return;

    if (step === 2) {
      if (!jobDescription || jobDescription.trim().length < 30) {
        toast.error("Please enter a valid job description before proceeding.");
        return;
      }
      setIsSavingStep(true);
      try {
        // Step 1 persisted: create the draft on the way out, or re-save it
        // when the user came back and edited the JD.
        if (draftIdRef.current) {
          await persistStep(toUpdatePayload({ jobDescription }));
        } else {
          await ensureDraft();
        }
        setCurrentStep(2);
      } finally {
        setIsSavingStep(false);
      }
      return;
    }

    if (step === 3) {
      // Transition immediately to Step 3 so the AI Loading Progress UI appears instantly
      setCurrentStep(3);
      setIsSavingStep(true);
      try {
        // Per-step save: resume (extracted text only - never file bytes).
        await persistStep(
          resumeRef ? toUpdatePayload({ resume: resumeRef }) : { resume: null },
        );
      } finally {
        setIsSavingStep(false);
      }
      if (!extractedData) {
        const ok = await runAnalysis();
        if (!ok) {
          setCurrentStep(2);
          return;
        }
      }
      return;
    }

    if (step === 4) {
      setIsSavingStep(true);
      try {
        // Per-step save: form overrides edited on the analysis step.
        await persistStep(
          toUpdatePayload({
            targetRole: roleTitle,
            company,
            category,
            industry,
            experienceLevel,
            sessionDurationMinutes,
          }),
        );
        setCurrentStep(4);
      } finally {
        setIsSavingStep(false);
      }
      return;
    }

    setCurrentStep(step);
  };

  /**
   * Final wizard submit. Steps 1-3 were already PATCHed as the user
   * advanced, so this publishes the draft (DRAFT -> ACTIVE) and creates the
   * rounds; if no draft was ever created (step saves all failed) it falls
   * back to the original single-request create.
   */
  const createFinalInterview = async () => {
    if (isCreating) return;
    if (!extractedData) {
      toast.error("Missing extracted job data.");
      return;
    }

    setIsCreating(true);
    let createdId: string | null = draftIdRef.current;
    let published = false;
    try {
      const finalExtracted: ExtractedJobData = {
        ...extractedData,
        roleTitle: roleTitle || extractedData.roleTitle,
        company: company || extractedData.company,
        category: category || extractedData.category,
        industry: industry || extractedData.industry,
        experienceLevel: experienceLevel || extractedData.experienceLevel,
        sessionDurationMinutes,
      };

      const title = company ? `${finalExtracted.roleTitle} @ ${company}` : finalExtracted.roleTitle;

      const eligibility = matchAnalysis
        ? matchAnalysis.overallScore >= 60
          ? "eligible"
          : "needs_resume_improvement"
        : "insufficient_information";

      const requirementLines = buildRequirementLines(finalExtracted);

      if (createdId) {
        // Draft exists: publish it with the final, user-reviewed values.
        await interviewsApi.update(createdId, {
          ...toUpdatePayload({
            title,
            targetRole: finalExtracted.roleTitle,
            company: finalExtracted.company,
            category: finalExtracted.category,
            industry: finalExtracted.industry,
            experienceLevel: finalExtracted.experienceLevel,
            sessionDurationMinutes,
            eligibilityStatus: eligibility,
            status: "ready", // -> server ACTIVE
          }),
          // JobInterview carries no jobRequirements field, so the mapper
          // cannot build it - append the derived summary directly.
          jobRequirements: requirementLines || null,
        });
      } else {
        // No draft (all step saves failed) - one-shot create, as before.
        const { data: created } = await interviewsApi.create(
          toCreatePayload({
            title,
            targetRole: finalExtracted.roleTitle,
            company: finalExtracted.company,
            category: finalExtracted.category,
            industry: finalExtracted.industry,
            experienceLevel: finalExtracted.experienceLevel,
            jobDescription,
            jobRequirements: requirementLines || undefined,
            resume: resumeRef || {
              name: "Standard Candidate Profile",
              type: "text",
              content: "General profile without specific uploaded resume.",
            },
            extractedJobData: finalExtracted,
            matchAnalysis: matchAnalysis || undefined,
            eligibilityStatus: eligibility,
            sessionDurationMinutes,
            status: "ACTIVE", // published: students see it immediately
          }),
        );
        createdId = created.id;
      }
      draftIdRef.current = createdId;
      published = true;

      // Sequential round creation keeps sequenceOrder deterministic.
      for (let i = 0; i < generatedRounds.length; i++) {
        await interviewsApi.createRound(createdId, toRoundPayload(generatedRounds[i], i));
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all });
      toast.success("Job Interview created successfully!");
      router.push(`/dashboard/interviews/${createdId}`);
    } catch (err) {
      console.error(err);
      queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all });
      if (published && createdId) {
        // Interview exists but a round failed - land on the workspace anyway
        // rather than silently losing everything.
        toast.error("Interview created, but one or more rounds failed to save.");
        router.push(`/dashboard/interviews/${createdId}`);
      } else if (createdId) {
        // Publish itself failed: keep the wizard open - the draft and every
        // step save are safe server-side, so retrying costs nothing.
        toast.error(getErrorMessage(err, "Couldn't publish the interview - your draft is saved, please try again."));
      } else {
        toast.error(getErrorMessage(err, "Failed to create job interview."));
      }
    } finally {
      setIsCreating(false);
    }
  };

  return {
    currentStep,
    setCurrentStep,
    goToStep,
    jobDescription,
    setJobDescription,
    resumeRef,
    setResumeRef,
    isAnalyzing,
    analysisPhase,
    runAnalysis,
    extractedData,
    parsedResumeData,
    matchAnalysis,
    generatedRounds,
    setGeneratedRounds,
    // Fields
    roleTitle,
    setRoleTitle,
    company,
    setCompany,
    category,
    setCategory,
    industry,
    setIndustry,
    experienceLevel,
    setExperienceLevel,
    sessionDurationMinutes,
    setSessionDurationMinutes,
    // Creation
    isSavingStep,
    isCreating,
    createFinalInterview,
  };
}
