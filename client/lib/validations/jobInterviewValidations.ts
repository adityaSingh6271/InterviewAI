import { z } from "zod";

export const jobDescriptionSchema = z.object({
  jobDescription: z
    .string()
    .min(30, "Job description must be at least 30 characters.")
    .max(20000, "Job description is too long."),
});

export const resumeUploadSchema = z.object({
  resumeName: z.string().min(1, "Resume name is required"),
  resumeContent: z.string().min(20, "Resume content must contain valid text information"),
});

export const extractedJobDataSchema = z.object({
  roleTitle: z.string().min(2, "Role title is required"),
  company: z.string().optional(),
  category: z.string().optional(),
  industry: z.string().optional(),
  experienceLevel: z.string().optional(),
  sessionDurationMinutes: z.number().min(15).max(120).default(30),
});

export type JobDescriptionFormValues = z.infer<typeof jobDescriptionSchema>;
export type ResumeUploadFormValues = z.infer<typeof resumeUploadSchema>;
export type ExtractedJobDataFormValues = z.infer<typeof extractedJobDataSchema>;
