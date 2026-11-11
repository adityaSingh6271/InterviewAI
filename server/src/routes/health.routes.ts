import { Router } from "express";
import { healthController } from "../controllers/health.controller";

/**
 * Health endpoints (PDF 0): liveness on `/`, readiness (with DB ping) on
 * `/ready`. Not rate-limited - probes come from infrastructure.
 */
export const healthRouter = Router();

healthRouter.get("/", healthController.getStatus);
healthRouter.get("/ready", healthController.getReadiness);
