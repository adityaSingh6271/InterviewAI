import { z } from "zod";
import { ADMIN_ROLES, APPLICATION_STATUSES, ATTEMPT_STATUSES } from "@/lib/api/admin";
import { SERVER_INTERVIEW_STATUSES } from "@/lib/api/interviews";

/**
 * Centralized admin-portal form validation (Standards §6: one Zod schema per
 * payload, shared by the form components; the server re-validates with Joi -
 * these messages mirror server/src/validations/* so 422 field details and
 * client hints agree).
 *
 * Create vs edit differences (required password / at-least-one-field) are
 * handled by mode factories that return the SAME output type, so one form
 * component can use either resolver without casts.
 */

// ---- Shared primitives -----------------------------------------------------

const email = z
  .email("Email must be a valid email address.")
  .max(254, "Email must be at most 254 characters.");

/** Create: required 8-72 chars. Edit: optional (absent/blank = unchanged). */
const passwordNew = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");
const passwordOptional = z
  .string()
  .max(72, "Password must be at most 72 characters.")
  .refine((value) => value === "" || value.length >= 8, {
    message: "Password must be at least 8 characters.",
  })
  .optional();

const requiredName = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(max, `Name must be at most ${max} characters.`);

const uuid = z.uuid("Must be a valid UUID.");

/** Alphanumeric invite code; uppercased before submit (server pattern). */
const joinCode = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, "Join code must be at least 3 characters.")
  .max(64, "Join code must be at most 64 characters.")
  .regex(/^[A-Z0-9]+$/, "Join code must be alphanumeric (A-Z, 0-9).");

type Mode = "create" | "edit";

// ---- Admin accounts --------------------------------------------------------

export const adminAccountSchema = (mode: Mode) =>
  z.object({
    name: requiredName(120),
    email,
    password: mode === "create" ? passwordNew : passwordOptional,
    role: z.enum(ADMIN_ROLES),
    /** Target institute - only honoured for admins above INSTITUTE_ADMIN. */
    instituteId: uuid.optional(),
  });

export type AdminAccountFormValues = z.output<ReturnType<typeof adminAccountSchema>>;

// ---- Students --------------------------------------------------------------

export const studentSchema = (mode: Mode) =>
  z.object({
    name: requiredName(120),
    email,
    password: mode === "create" ? passwordNew : passwordOptional,
    /** Defaults to the acting admin's institute server-side. */
    instituteId: uuid.optional(),
  });

export type StudentFormValues = z.output<ReturnType<typeof studentSchema>>;

// ---- Institutes ------------------------------------------------------------

/** Mode-independent: create and edit validate the same shape (the dialog
 *  decides whether a blank join code means "generate" or "keep"). */
export const instituteSchema = z.object({
  name: requiredName(160),
  /** Optional - the service generates one when absent. */
  joinCode: joinCode.optional().or(z.literal("")),
  /** SUPER_ADMIN only (service rank-checks). */
  organizationId: uuid.optional(),
});

export type InstituteFormValues = z.output<typeof instituteSchema>;

// ---- Organizations ---------------------------------------------------------

export const organizationSchema = z.object({
  name: requiredName(160),
});

export type OrganizationFormValues = z.output<typeof organizationSchema>;

// ---- LLM configs -----------------------------------------------------------

export const llmConfigSchema = (mode: Mode) =>
  z.object({
    provider: z
      .string()
      .trim()
      .min(1, "Provider is required.")
      .max(60, "Provider must be at most 60 characters."),
    modelName: z
      .string()
      .trim()
      .min(1, "Model name is required.")
      .max(120, "Model name must be at most 120 characters."),
    /** Write-only: encrypted at rest, never returned by any read endpoint. */
    apiKey:
      mode === "create"
        ? z
            .string()
            .trim()
            .min(8, "API key must be at least 8 characters.")
            .max(512, "API key must be at most 512 characters.")
        : z
            .string()
            .trim()
            .min(8, "API key must be at least 8 characters.")
            .max(512, "API key must be at most 512 characters.")
            .optional(),
    isActive: z.boolean(), // default supplied via form defaultValues
    /** Optional settings overrides: baseUrl for custom/local endpoints, temperature, maxTokens */
    baseUrl: z
      .string()
      .trim()
      .max(255, "Base URL cannot exceed 255 characters.")
      .optional()
      .or(z.literal("")),
    temperature: z
      .number()
      .min(0, "Temperature must be at least 0.0")
      .max(2, "Temperature cannot exceed 2.0")
      .optional(),
    maxTokens: z
      .number()
      .int("Max tokens must be an integer")
      .min(50, "At least 50 tokens")
      .max(32000, "Maximum 32,000 tokens")
      .optional(),
  });

export type LlmConfigFormValues = z.output<ReturnType<typeof llmConfigSchema>>;

// ---- Oversight filters (URL-synced list state) ------------------------------

/** Status dropdown values used by the admin list pages. */
export const adminFilterSchemas = {
  interviewStatus: z.enum(SERVER_INTERVIEW_STATUSES),
  applicationStatus: z.enum(APPLICATION_STATUSES),
  attemptStatus: z.enum(ATTEMPT_STATUSES),
  adminRole: z.enum(ADMIN_ROLES),
};
