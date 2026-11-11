/**
 * Development seed (pnpm db:seed) - idempotent, refuses to run in production.
 *
 * Multi-tenant architecture:
 * Creates the organization, institutes with join codes, admin accounts,
 * super admin, and demo student accounts segregated under their respective institutes.
 *
 * Seed accounts:
 * - Super Admin (Platform-wide authority):
 *     adityasingh@gmail.com / 90909090 (Role: SUPER_ADMIN)
 * - Institute "demo" (join code "DEMO"):
 *     Admin: demo@gmail.com / 12345678 (Role: INSTITUTE_ADMIN)
 *     Student: student@demo.com / Student123! (Code: DEMO)
 * - Institute "Dev Institute" (join code "DEV2026"):
 *     Admin: admin@example.com / Admin123! (Role: INSTITUTE_ADMIN)
 *     Student: student@example.com / Student123! (Code: DEV2026)
 *
 * Raw SQL on purpose: Prisma is schema-management only;
 * runtime/data scripts talk to PostgreSQL through pg.
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { Pool } from "pg";
import { encryptSecret } from "../src/utils/encryption.util";

const ORG_NAME = "InterviewAI Dev Organization";

interface SeedInstitute {
  name: string;
  joinCode: string;
  admins: Array<{
    name: string;
    email: string;
    password: string;
    role?: "SUPER_ADMIN" | "ORG_ADMIN" | "INSTITUTE_ADMIN";
  }>;
  students: Array<{ name: string; email: string; password: string }>;
}

const SUPER_ADMIN = {
  name: "Aditya Singh",
  email: "adityasingh@gmail.com",
  password: process.env.SEED_SUPER_ADMIN_PASSWORD ?? "90909090",
  role: "SUPER_ADMIN" as const,
};

const SEED_DATA: SeedInstitute[] = [
  {
    name: "demo",
    joinCode: "DEMO",
    admins: [
      {
        name: "Demo Admin",
        email: "demo@gmail.com",
        password: process.env.SEED_DEMO_PASSWORD ?? "12345678",
        role: "INSTITUTE_ADMIN",
      },
    ],
    students: [
      {
        name: "Demo Student",
        email: "student@demo.com",
        password: process.env.SEED_DEMO_STUDENT_PASSWORD ?? "Student123!",
      },
    ],
  },
  {
    name: "Dev Institute",
    joinCode: "DEV2026",
    admins: [
      {
        name: "Dev Admin",
        email: "admin@example.com",
        password: process.env.SEED_ADMIN_PASSWORD ?? "Admin123!",
        role: "INSTITUTE_ADMIN",
      },
    ],
    students: [
      {
        name: "Dev Student",
        email: "student@example.com",
        password: process.env.SEED_STUDENT_PASSWORD ?? "Student123!",
      },
    ],
  },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV=production");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (copy .env.example to .env)");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // 1. Organization (unique by name)
    let org = await pool.query<{ id: string }>(
      `SELECT id FROM organizations WHERE name = $1 LIMIT 1`,
      [ORG_NAME],
    );
    if (!org.rows[0]) {
      org = await pool.query<{ id: string }>(
        `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
        [ORG_NAME],
      );
      console.log(`+ organization: ${ORG_NAME}`);
    }
    const organizationId = org.rows[0]!.id;

    // 1b. Seed active LLM config for the organization if none exists
    const existingLlm = await pool.query<{ id: string }>(
      `SELECT id FROM organization_llm_configs WHERE organization_id = $1 LIMIT 1`,
      [organizationId],
    );
    if (!existingLlm.rows[0]) {
      const isGemini = Boolean(process.env.GEMINI_API_KEY);
      const isGroq = !isGemini && Boolean(process.env.GROQ_API_KEY);
      const provider = isGemini ? "gemini" : isGroq ? "groq" : "openai";
      const modelName = isGemini
        ? (process.env.GEMINI_MODEL || "gemini-3.8-flash")
        : isGroq
          ? (process.env.GROQ_MODEL || "openai/gpt-oss-120b")
          : (process.env.OPENAI_MODEL || "gpt-4o-mini");
      const baseUrl = isGemini
        ? "https://generativelanguage.googleapis.com/v1beta/openai"
        : isGroq
          ? "https://api.groq.com/openai/v1"
          : "https://api.openai.com/v1";
      const apiKey =
        process.env.GEMINI_API_KEY ||
        process.env.GROQ_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.LLM_API_KEY ||
        "gsk_interviewai_default_llm_key";
      const encryptedKey = encryptSecret(apiKey);
      await pool.query(
        `INSERT INTO organization_llm_configs (organization_id, provider, model_name, api_key_encrypted, settings, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          organizationId,
          provider,
          modelName,
          encryptedKey,
          JSON.stringify({
            baseUrl,
            temperature: 0.3,
            maxTokens: 2048,
            timeoutMs: 30000,
          }),
          true,
        ],
      );
      console.log(`+ LLM config:  ${provider} / ${modelName} (Active)`);
    } else {
      console.log(`✓ LLM config:  Active LLM configuration present`);
    }

    let primaryInstituteId: string | null = null;

    // 2. Iterate through Institutes and seed each with join code, admins, and students
    for (const inst of SEED_DATA) {
      let institute = await pool.query<{ id: string }>(
        `SELECT id FROM institutes WHERE join_code = $1`,
        [inst.joinCode],
      );
      if (!institute.rows[0]) {
        institute = await pool.query<{ id: string }>(
          `INSERT INTO institutes (organization_id, name, join_code)
           VALUES ($1, $2, $3) RETURNING id`,
          [organizationId, inst.name, inst.joinCode],
        );
        console.log(`+ institute:   ${inst.name} (invite code: ${inst.joinCode})`);
      } else {
        await pool.query(
          `UPDATE institutes SET name = $1 WHERE id = $2`,
          [inst.name, institute.rows[0].id],
        );
        console.log(`✓ institute:   ${inst.name} (invite code: ${inst.joinCode}) [exists]`);
      }
      const instituteId = institute.rows[0]!.id;
      if (!primaryInstituteId) primaryInstituteId = instituteId;

      // Seed Admins for this institute
      for (const admin of inst.admins) {
        const adminHash = await bcrypt.hash(admin.password, 10);
        const adminRole = admin.role ?? "INSTITUTE_ADMIN";
        await pool.query(
          `INSERT INTO admins (institute_id, name, email, password_hash, role, refresh_token_hash, failed_attempts, locked_until)
           VALUES ($1, $2, $3, $4, $5, NULL, 0, NULL)
           ON CONFLICT (email) DO UPDATE SET
             password_hash = EXCLUDED.password_hash,
             institute_id = EXCLUDED.institute_id,
             name = EXCLUDED.name,
             role = EXCLUDED.role,
             failed_attempts = 0,
             locked_until = NULL`,
          [instituteId, admin.name, admin.email, adminHash, adminRole],
        );
        console.log(`  + admin:     ${admin.email} [${adminRole}] (Password: ${admin.password})`);
      }

      // Seed Students for this institute
      for (const student of inst.students) {
        const studentHash = await bcrypt.hash(student.password, 10);
        await pool.query(
          `INSERT INTO students (institute_id, name, email, password_hash, refresh_token_hash, failed_attempts, locked_until)
           VALUES ($1, $2, $3, $4, NULL, 0, NULL)
           ON CONFLICT (email) DO UPDATE SET
             password_hash = EXCLUDED.password_hash,
             institute_id = EXCLUDED.institute_id,
             name = EXCLUDED.name,
             failed_attempts = 0,
             locked_until = NULL`,
          [instituteId, student.name, student.email, studentHash],
        );
        console.log(`  + student:   ${student.email} (Password: ${student.password})`);
      }
    }

    // 3. Seed Platform Super Admin (linked to primary institute)
    if (primaryInstituteId) {
      const superAdminHash = await bcrypt.hash(SUPER_ADMIN.password, 10);
      await pool.query(
        `INSERT INTO admins (institute_id, name, email, password_hash, role, refresh_token_hash, failed_attempts, locked_until)
         VALUES ($1, $2, $3, $4, $5, NULL, 0, NULL)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           institute_id = EXCLUDED.institute_id,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           failed_attempts = 0,
           locked_until = NULL`,
        [primaryInstituteId, SUPER_ADMIN.name, SUPER_ADMIN.email, superAdminHash, SUPER_ADMIN.role],
      );
      console.log(`\n+ SUPER ADMIN: ${SUPER_ADMIN.email} [SUPER_ADMIN] (Password: ${SUPER_ADMIN.password})`);
    }

    console.log("\n==================================================");
    console.log("Seed complete! Credentials summary:");
    console.log("==================================================");
    console.log("👑 Platform SUPER ADMIN (Full Global Access):");
    console.log(`  Email:           ${SUPER_ADMIN.email}`);
    console.log(`  Password:        ${SUPER_ADMIN.password}`);
    console.log(`  Role:            ${SUPER_ADMIN.role}`);
    console.log("--------------------------------------------------");
    console.log("Institute 1: 'demo'");
    console.log("  Join Code:       DEMO");
    console.log("  Faculty/Admin:   demo@gmail.com / 12345678 (Role: INSTITUTE_ADMIN)");
    console.log("  Student Demo:    student@demo.com / Student123!");
    console.log("--------------------------------------------------");
    console.log("Institute 2: 'Dev Institute'");
    console.log("  Join Code:       DEV2026");
    console.log("  Faculty/Admin:   admin@example.com / Admin123! (Role: INSTITUTE_ADMIN)");
    console.log("  Student Demo:    student@example.com / Student123!");
    console.log("==================================================");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
