import type { RequestHandler } from "express";
import path from "node:path";
import multer, { MulterError } from "multer";
import {
  RESUME_ACCEPTED_TYPES,
  RESUME_FILE_MAX_BYTES,
} from "../constants/resume.constants";
import { AppError } from "../utils/app-error.util";

/**
 * Multipart upload middleware for resume extraction (Standards PDF 21:
 * size limit, MIME + extension check, exactly one file; PDF 9: uploads are
 * validated at the edge). Files land in memory only - the endpoint returns
 * extracted text and stores nothing (no bucket/webroot writes).
 *
 * `memoryStorage` keeps the buffer available to the service, which parses
 * and discards it; the 10MB ceiling is the multer limit, independent of the
 * JSON body limit.
 */

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: RESUME_FILE_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = RESUME_ACCEPTED_TYPES[extension];
    if (!allowedMimeTypes) {
      callback(
        AppError.unprocessable("Unsupported file type", [
          {
            field: "file",
            message: `Only ${Object.keys(RESUME_ACCEPTED_TYPES).join(", ")} files are accepted`,
          },
        ]),
      );
      return;
    }
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(
        AppError.unprocessable("File type does not match its extension", [
          { field: "file", message: `"${extension}" files must declare ${allowedMimeTypes[0]}` },
        ]),
      );
      return;
    }
    callback(null, true);
  },
});

const singleFile = upload.single("file");

const AUDIO_FILE_MAX_BYTES = 15 * 1024 * 1024;
const AUDIO_EXTENSIONS = new Set([".webm", ".wav", ".mp3", ".m4a", ".ogg", ".mp4"]);

const audioUpload = multer({
  storage,
  limits: { fileSize: AUDIO_FILE_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    if (mime.startsWith("audio/") || mime === "video/webm" || AUDIO_EXTENSIONS.has(extension)) {
      callback(null, true);
      return;
    }
    callback(
      AppError.unprocessable("Unsupported audio type", [
        { field: "file", message: "Only browser audio recordings (.webm, .ogg, .wav, .mp3, .m4a) are accepted" },
      ]),
    );
  },
}).single("file");

function makeUploadHandler(singleUpload: RequestHandler, maxBytes: number, tooLargeLabel: string): RequestHandler {
  return (req, res, next) => {
    singleUpload(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }
      if (error instanceof MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          next(
            AppError.unprocessable(tooLargeLabel, [
              { field: "file", message: `File must be at most ${maxBytes / 1024 / 1024}MB` },
            ]),
          );
          return;
        }
        if (error.code === "LIMIT_UNEXPECTED_FILE" || error.code === "LIMIT_PART_COUNT") {
          next(
            AppError.unprocessable("Unexpected upload field", [
              { field: "file", message: 'Attach exactly one file under the "file" field' },
            ]),
          );
          return;
        }
        next(AppError.unprocessable(error.message));
        return;
      }
      // fileFilter errors are already AppErrors; anything else keeps its type.
      next(error);
    });
  };
}

/**
 * Express-style wrapper so multer's callback errors reach the central error
 * handler as AppErrors (422) instead of bubbling up as 500s.
 */
export const uploadResumeFile: RequestHandler = makeUploadHandler(
  singleFile,
  RESUME_FILE_MAX_BYTES,
  "Resume file is too large",
);

/** Multipart middleware for spoken interview answer audio transcription. */
export const uploadAudioFile: RequestHandler = makeUploadHandler(
  audioUpload,
  AUDIO_FILE_MAX_BYTES,
  "Audio recording is too large",
);
