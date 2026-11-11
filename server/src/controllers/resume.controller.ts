import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { resumeService } from "../services/resume.service";
import { AppError } from "../utils/app-error.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Resume controller (PDF 12: thin) - parse the uploaded file from the
 * multipart middleware and answer with extracted data only. Nothing is
 * persisted here; the client stores the result through the interview
 * create/update endpoints.
 */
export const resumeController = {
  extract: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw AppError.unprocessable("No resume file received", [
        { field: "file", message: 'Attach exactly one file under the "file" field' },
      ]);
    }
    sendSuccess(res, 200, await resumeService.extract(file));
  }),
};
