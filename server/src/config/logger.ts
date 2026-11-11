import path from "node:path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { env } from "./env";

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

/**
 * Structured application logger (PDF 17: Logging & Monitoring).
 *
 * - JSON lines with levels error/warn/info/debug.
 * - Daily rotating file with 14 days of retention, plus console.
 * - Never log passwords, tokens, or SQL parameter values.
 */

/** Always writes JSON so log shippers can parse it. */
const fileTransport = new DailyRotateFile({
  filename: path.join("logs", "application-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  format: combine(timestamp(), errors({ stack: true }), json()),
});

/** Human-readable in development, JSON in production. */
const consoleFormat = env.isProduction
  ? combine(timestamp(), errors({ stack: true }), json())
  : combine(
      colorize(),
      timestamp({ format: "HH:mm:ss" }),
      errors({ stack: true }),
      printf((info) => {
        const { level, message, timestamp: ts, stack, ...meta } = info as Record<
          string,
          unknown
        > & { level: string; message: unknown; timestamp?: string };
        const rest = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
        const tsLabel = typeof ts === "string" ? ts : "";
        const stackLabel = typeof stack === "string" ? `\n${stack}` : "";
        return `${tsLabel} ${level} ${String(message)}${rest}${stackLabel}`;
      }),
    );

export const logger = winston.createLogger({
  level: env.logLevel,
  defaultMeta: { service: "ai-interviewer-server" },
  transports: [fileTransport, new winston.transports.Console({ format: consoleFormat })],
});
