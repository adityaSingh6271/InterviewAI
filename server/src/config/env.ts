import "dotenv/config";
import Joi from "joi";

/**
 * Runtime configuration, validated once at startup.
 *
 * Standards: PDF 23 (Configuration & Environment) - Joi schema, fail fast on
 * missing/invalid env, no defaults for secrets, `.env.example` maintained.
 * If validation fails the process writes the reasons to stderr and exits
 * before anything else touches the environment.
 */
export type Env = {
  port: number;
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  /** Origins allowed by CORS - parsed from comma-separated CLIENT_ORIGIN. */
  clientOrigins: string[];
  /** PostgreSQL connection string (required, no default). */
  databaseUrl: string;
  /** JWT access-token secret (required, min 32 chars, no default). */
  jwtSecret: string;
  /** JWT refresh-token secret (required, min 32 chars, no default). */
  jwtRefreshSecret: string;
  /** bcrypt cost factor; PDF 10 requires >= 10. */
  bcryptRounds: number;
  /** Maximum connections in the pg pool. */
  dbPoolMax: number;
  /** Queries slower than this are logged at warn level. */
  slowQueryMs: number;
  logLevel: "error" | "warn" | "info" | "debug";
};

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  PORT: Joi.number().port().default(4000),
  CLIENT_ORIGIN: Joi.string()
    .trim()
    .default("http://localhost:3000")
    .custom((value, helpers) => {
      const list = value
        .split(",")
        .map((item: string) => item.trim())
        .filter(Boolean);
      for (const item of list) {
        if (Joi.string().uri().validate(item).error) {
          return helpers.message({
            custom: `CLIENT_ORIGIN contains an invalid URI: ${item}`,
          });
        }
      }
      return list;
    }, "origin list")
    .messages({
      "any.custom": "CLIENT_ORIGIN must be a comma-separated list of URIs",
    }),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgres", "postgresql"] })
    .required()
    .messages({
      "string.uri": "DATABASE_URL must be a postgresql:// connection string",
      "any.required": "DATABASE_URL is required",
    }),
  JWT_SECRET: Joi.string().min(32).required().messages({
    "string.min": "JWT_SECRET must be at least 32 characters",
    "any.required": "JWT_SECRET is required",
  }),
  JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
    "string.min": "JWT_REFRESH_SECRET must be at least 32 characters",
    "any.required": "JWT_REFRESH_SECRET is required",
  }),
  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(10),
  DB_POOL_MAX: Joi.number().integer().min(1).max(100).default(10),
  SLOW_QUERY_MS: Joi.number().integer().min(1).default(200),
  LOG_LEVEL: Joi.string().valid("error", "warn", "info", "debug").optional(),
}).unknown(true);

const { error, value } = schema.validate(process.env, {
  abortEarly: false,
  convert: true,
});

if (error) {
  const lines = error.details.map(
    (detail) =>
      `  - ${detail.path.join(".") || "environment"}: ${detail.message}`,
  );
  // stderr, not the logger: the logger itself needs this configuration.
  process.stderr.write(`[env] invalid configuration:\n${lines.join("\n")}\n`);
  process.exit(1);
}

const nodeEnv = value.NODE_ENV as Env["nodeEnv"];
const isProduction = nodeEnv === "production";

export const env: Env = {
  port: value.PORT,
  nodeEnv,
  isProduction,
  clientOrigins: value.CLIENT_ORIGIN,
  databaseUrl: value.DATABASE_URL,
  jwtSecret: value.JWT_SECRET,
  jwtRefreshSecret: value.JWT_REFRESH_SECRET,
  bcryptRounds: value.BCRYPT_ROUNDS,
  dbPoolMax: value.DB_POOL_MAX,
  slowQueryMs: value.SLOW_QUERY_MS,
  logLevel: value.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
};
