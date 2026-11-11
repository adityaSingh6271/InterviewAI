import path from "node:path";
import mammoth from "mammoth";
import { extractText } from "unpdf";
import { RESUME_TEXT_MAX } from "../constants/resume.constants";
import { AppError } from "../utils/app-error.util";

/**
 * Resume extraction service (Standards PDF 13: business logic here, no HTTP
 * concerns). Turns an uploaded PDF/DOCX/TXT into the extracted data the
 * wizard persists in `Interview.resume` - never raw file bytes. The text is
 * capped at RESUME_TEXT_MAX, the same limit Joi enforces on the interview
 * create/update schemas, so what this returns can always be saved back.
 */

export type ExtractedResume = {
  name: string;
  type: "uploaded";
  content: string;
  size: number;
  mimeType: string;
  /** ISO timestamp of when the text was extracted. */
  extractedAt: string;
};

export type UploadedResumeFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

/** unpdf's bundled pdf.js rejects Node Buffers - pass a plain Uint8Array. */
function toUint8Array(buffer: Buffer): Uint8Array {
  return Uint8Array.from(buffer);
}

/** Strip NULs/noise, normalise newlines, cap at the shared text limit. */
function normalizeText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .slice(0, RESUME_TEXT_MAX);
}

/** Basename only (no path fragments), control chars removed, length-capped. */
function safeFileName(originalName: string): string {
  return path
    .basename(originalName)
    .replace(/[\u0000-\u001f]/g, "")
    .slice(0, 255);
}

export const resumeService = {
  async extract(file: UploadedResumeFile): Promise<ExtractedResume> {
    const name = safeFileName(file.originalname);
    const extension = path.extname(name).toLowerCase();

    let rawText: string;
    try {
      if (extension === ".pdf") {
        const { text } = await extractText(toUint8Array(file.buffer), { mergePages: true });
        rawText = text ?? "";
      } else if (extension === ".docx") {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        rawText = result.value ?? "";
      } else if (extension === ".txt") {
        rawText = file.buffer.toString("utf8");
      } else {
        // Unreachable - upload.middleware rejects anything else first.
        throw AppError.unprocessable("Unsupported file type", [
          { field: "file", message: "Only .pdf, .docx and .txt files are accepted" },
        ]);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.unprocessable(
        `Could not extract text from "${name}" - re-save it as PDF or DOCX and try again`,
      );
    }

    const content = normalizeText(rawText);
    if (!content.trim()) {
      throw AppError.unprocessable(
        `"${name}" has no selectable text (scanned image?) - use Paste Resume Text instead`,
      );
    }

    return {
      name,
      type: "uploaded",
      content,
      size: file.size,
      mimeType: file.mimetype,
      extractedAt: new Date().toISOString(),
    };
  },
};
