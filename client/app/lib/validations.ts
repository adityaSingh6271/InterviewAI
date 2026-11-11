import { z } from "zod";

// Strict Regular expressions disallowing unwanted special characters
export const STRICT_NAME_REGEX = /^[a-zA-Z\s]+$/; // Alphabetic letters and spaces only (no numbers, symbols or special characters)
export const INSTITUTE_CODE_REGEX = /^[a-zA-Z0-9_-]+$/; // Letters, numbers, hyphens, and underscores only
export const NO_SPACES_REGEX = /^[^\s]+$/; // Disallows whitespace/spaces
export const ROLE_REGEX = /^[a-zA-Z0-9\s\-&./()]+$/; // Letters, numbers, spaces and basic punctuation only
export const COMPANY_REGEX = /^[a-zA-Z0-9\s]+$/; // Alphabetic letters, numbers and spaces only (no special characters)
export const SAFE_TEXTAREA_REGEX = /^[^<>{}[\]$~`]*$/; // Disallows code injection/special brackets < > { } [ ] $ ~ `
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .max(100, "Email address cannot exceed 100 characters")
    .regex(NO_SPACES_REGEX, "Email address cannot contain spaces")
    .regex(EMAIL_REGEX, "Please enter a valid email address (e.g. name@example.com)"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password cannot exceed 64 characters")
    .regex(NO_SPACES_REGEX, "Password cannot contain spaces"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(50, "Full name cannot exceed 50 characters")
      .regex(
        STRICT_NAME_REGEX,
        "Full name can only contain letters and spaces (no numbers or special characters allowed)"
      )
      .refine(
        (val) => val.replace(/\s+/g, "").length >= 2,
        "Full name must contain at least 2 letters"
      ),
    email: z
      .string()
      .trim()
      .min(1, "Work email is required")
      .max(100, "Work email cannot exceed 100 characters")
      .regex(NO_SPACES_REGEX, "Work email cannot contain spaces")
      .regex(EMAIL_REGEX, "Please enter a valid email address (e.g. alex@techcorp.io)"),
    instituteCode: z
      .string()
      .trim()
      .min(3, "Institute code must be at least 3 characters")
      .max(30, "Institute code cannot exceed 30 characters")
      .regex(
        INSTITUTE_CODE_REGEX,
        "Institute code can only contain letters, numbers, hyphens, and underscores (no spaces or special characters)"
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(64, "Password cannot exceed 64 characters")
      .regex(NO_SPACES_REGEX, "Password cannot contain spaces")
      .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
      .regex(/[0-9]/, "Password must contain at least 1 number (0-9)")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least 1 special character (!@#$%^&*...)"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password")
      .max(64, "Confirm password cannot exceed 64 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupFormData = z.infer<typeof signupSchema>;

export const sessionSchema = z.object({
  role: z
    .string()
    .trim()
    .min(3, "Role title must be at least 3 characters")
    .max(80, "Role title cannot exceed 80 characters")
    .regex(
      ROLE_REGEX,
      "Role title can only contain letters, numbers, spaces, and basic punctuation (&, -, ., /, ())"
    ),
  company: z
    .string()
    .trim()
    .min(2, "Target company must be at least 2 characters")
    .max(50, "Company name cannot exceed 50 characters")
    .regex(
      COMPANY_REGEX,
      "Company name can only contain letters, numbers, and spaces (no special characters allowed)"
    ),
  category: z.enum(["Technical", "Behavioral", "System Design"], {
    message: "Please select a valid interview category",
  }),
  duration: z.string().min(1, "Please select session duration"),
  interviewer: z
    .string()
    .trim()
    .min(2, "Interviewer name is required")
    .max(60, "Interviewer name cannot exceed 60 characters")
    .regex(
      ROLE_REGEX,
      "Interviewer name can only contain letters, numbers, and basic punctuation"
    ),
  notes: z
    .string()
    .trim()
    .max(300, "Preparation notes cannot exceed 300 characters")
    .regex(
      SAFE_TEXTAREA_REGEX,
      "Preparation notes cannot contain invalid special characters (<, >, {, }, [, ], $, ~, `)"
    )
    .optional()
    .or(z.literal("")),
});

export type SessionFormData = z.infer<typeof sessionSchema>;

export const settingsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name cannot exceed 50 characters")
    .regex(
      STRICT_NAME_REGEX,
      "Display name can only contain letters and spaces (no numbers or special characters)"
    ),
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .max(100, "Email cannot exceed 100 characters")
    .regex(EMAIL_REGEX, "Please enter a valid email address"),
  targetSeniority: z
    .string()
    .trim()
    .min(3, "Seniority title must be at least 3 characters")
    .max(80, "Seniority title cannot exceed 80 characters")
    .regex(ROLE_REGEX, "Seniority title contains invalid special characters")
    .optional()
    .or(z.literal("")),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

export const ticketSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters")
    .regex(
      STRICT_NAME_REGEX,
      "Name can only contain letters and spaces (no numbers or special characters)"
    ),
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .max(100, "Email cannot exceed 100 characters")
    .regex(EMAIL_REGEX, "Please enter a valid email address"),
  category: z.enum([
    "Mock Interviews",
    "Audio / Telemetry",
    "Billing & Plans",
    "Feature Request",
    "Other",
  ]),
  subject: z
    .string()
    .trim()
    .min(5, "Subject must be at least 5 characters")
    .max(100, "Subject cannot exceed 100 characters")
    .regex(
      ROLE_REGEX,
      "Subject can only contain letters, numbers, and basic punctuation"
    ),
  message: z
    .string()
    .trim()
    .min(15, "Please provide at least 15 characters describing your request")
    .max(1000, "Message cannot exceed 1000 characters")
    .regex(
      SAFE_TEXTAREA_REGEX,
      "Message cannot contain invalid special characters (<, >, {, }, [, ], $, ~, `)"
    ),
});

export type TicketFormData = z.infer<typeof ticketSchema>;

