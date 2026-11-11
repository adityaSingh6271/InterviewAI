import type { RequestHandler } from "express";
import { ERROR_CODES } from "../constants/error-codes";
import { asyncHandler } from "../middleware/async-handler";
import { healthService } from "../services/health.service";
import { AppError } from "../utils/app-error.util";
import { sendSuccess } from "../utils/response.util";

/**
 * Health controllers (PDF 12: thin). Liveness is synchronous; readiness
 * awaits the database ping and answers 503 with per-dependency details when
 * the database is down (PDF 0: /health and /health/ready with DB ping).
 */
export const healthController = {
  getStatus: ((req, res) => {
    sendSuccess(res, 200, healthService.liveness());
  }) satisfies RequestHandler,

  getReadiness: asyncHandler(async (req, res) => {
    const checks = await healthService.readiness();

    if (!checks.ok) {
      const down = Object.entries(checks.dependencies)
        .filter(([, value]) => value.status === "down")
        .map(([name, value]) => ({
          field: name,
          message: value.detail ?? "unavailable",
        }));
      throw new AppError(
        503,
        ERROR_CODES.SERVICE_NOT_READY,
        "Service not ready",
        down,
      );
    }

    sendSuccess(res, 200, checks);
  }),
};
