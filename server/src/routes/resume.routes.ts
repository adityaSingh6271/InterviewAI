import { Router } from "express";
import { resumeController } from "../controllers/resume.controller";
import { protect } from "../middleware/auth.middleware";
import { uploadResumeFile } from "../middleware/upload.middleware";

/**
 * Resume routes. Extraction is a pure function of the upload - the endpoint
 * answers with parsed text and stores no file (the interview `resume` jsonb
 * only ever receives that extracted data, never bytes).
 *
 * Mounted at /resumes -> /api/v1/resumes
 *
 * POST   /resumes   -> 200 (extracted data) | 401 | 422 (bad/oversized file)
 */
export const resumeRouter = Router();

resumeRouter.post("/", protect, uploadResumeFile, resumeController.extract);
