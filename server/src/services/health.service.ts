import { pingDatabase } from "../config/db";
import { env } from "../config/env";

export type DependencyCheck = {
  status: "ok" | "down";
  detail?: string;
};

export type LivenessResult = {
  status: "ok";
  service: string;
  timestamp: string;
  uptimeSec: number;
};

export type ReadinessResult = {
  ok: boolean;
  environment: string;
  dependencies: Record<string, DependencyCheck>;
};

/**
 * Health checks (PDF 0 + 2):
 * - `/health`  - liveness only: is the process serving? No dependencies.
 * - `/health/ready` - readiness: pings PostgreSQL and reports 503 until the
 *   database answers, so a load balancer never routes to a broken instance.
 *
 * When a datastore or external API is added, register its probe here.
 */
export const healthService = {
  liveness(): LivenessResult {
    return {
      status: "ok",
      service: "ai-interviewer-server",
      timestamp: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
    };
  },

  async readiness(): Promise<ReadinessResult> {
    const databaseUp = await pingDatabase();

    return {
      ok: databaseUp,
      environment: env.nodeEnv,
      dependencies: databaseUp
        ? { database: { status: "ok" } }
        : { database: { status: "down", detail: "postgresql unreachable" } },
    };
  },
};
