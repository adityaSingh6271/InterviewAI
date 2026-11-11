import { query } from "../config/db";
import type { AuthUser, AuthUserWithSecrets } from "../types/auth.types";
import type { ListParams, Paginated } from "../types/entities.types";
import { buildCountQuery, buildListQuery } from "../utils/query.util";

/**
 * Students repository - the only place SQL for the `students` table lives
 * (PDF 3: repository pattern, raw SQL only here, no ORM).
 *
 * Auth queries (self-registration/lockout) coexist with account CRUD used by
 * the admin portal. Rules honoured by every statement below:
 * - explicit column lists, never `SELECT *` (PDF 4);
 * - `$1, $2, ...` placeholders, never string interpolation (PDF 4);
 * - columns are snake_case, mapped to camelCase domain fields on the way out;
 * - password and refresh-token material never leaves this file unmapped -
 *   `findByEmail`/`findByRefreshTokenHash` return the internal shape the auth
 *   service needs; everything else returns the public shape.
 */

/** All columns an auth read may need - kept explicit so new columns are opt-in. */
const SELECT_COLUMNS = `id, institute_id, name, email, password_hash, refresh_token_hash, failed_attempts, locked_until, created_at, updated_at`;

/** Public projection for list/read - never fetches secret material. */
const PUBLIC_COLUMNS = `id, institute_id, name, email, created_at, updated_at`;

const SORT_COLUMNS: Record<string, string> = {
  createdAt: "created_at",
  name: "name",
  email: "email",
};

type StudentRow = {
  id: string;
  institute_id: string;
  name: string;
  email: string;
  password_hash: string;
  refresh_token_hash: string | null;
  failed_attempts: number;
  locked_until: Date | null;
  created_at: Date;
  updated_at: Date;
};

type StudentPublicRow = Omit<
  StudentRow,
  "password_hash" | "refresh_token_hash" | "failed_attempts" | "locked_until"
>;

/** snake_case row -> camelCase domain object (public fields only). */
function toStudent(row: StudentPublicRow): AuthUser {
  return {
    id: row.id,
    portal: "student",
    name: row.name,
    email: row.email,
    instituteId: row.institute_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** snake_case row -> internal object including secrets (service layer only). */
function toStudentWithSecrets(row: StudentRow): AuthUserWithSecrets {
  return {
    ...toStudent(row),
    passwordHash: row.password_hash,
    refreshTokenHash: row.refresh_token_hash,
    failedAttempts: row.failed_attempts,
    lockedUntil: row.locked_until ? row.locked_until.toISOString() : null,
  };
}

export const studentRepository = {
  /**
   * Insert a new student with its initial refresh-token hash.
   * A duplicate email violates the UNIQUE constraint (SQLSTATE 23505), which
   * the service maps to 409. `refreshTokenHash` is optional: the auth
   * register flow mints one, admin-provisioned accounts start signed out.
   */
  async create(input: {
    id: string;
    instituteId: string;
    name: string;
    email: string;
    passwordHash: string;
    refreshTokenHash?: string | null;
  }): Promise<AuthUser> {
    const { rows } = await query<StudentPublicRow>(
      `INSERT INTO students (id, institute_id, name, email, password_hash, refresh_token_hash, failed_attempts, locked_until)
       VALUES ($1, $2, $3, $4, $5, $6, 0, NULL)
       RETURNING ${PUBLIC_COLUMNS}`,
      [
        input.id,
        input.instituteId,
        input.name,
        input.email,
        input.passwordHash,
        input.refreshTokenHash ?? null,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("INSERT returned no row");
    return toStudent(row);
  },

  /** Look up credentials by email (citext = case-insensitive match). */
  async findByEmail(email: string): Promise<AuthUserWithSecrets | null> {
    const { rows } = await query<StudentRow>(
      `SELECT ${SELECT_COLUMNS} FROM students WHERE email = $1`,
      [email],
    );
    const row = rows[0];
    return row ? toStudentWithSecrets(row) : null;
  },

  /** Public profile lookup - used by `protect` to resolve the session. */
  async findById(id: string): Promise<AuthUser | null> {
    const { rows } = await query<StudentRow>(
      `SELECT ${SELECT_COLUMNS} FROM students WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toStudent(row) : null;
  },

  /**
   * Resolve the student behind a refresh token by its SHA-256 digest - the
   * raw token is never compared in SQL (PDF 10: tokens stored hashed).
   */
  async findByRefreshTokenHash(hash: string): Promise<AuthUserWithSecrets | null> {
    const { rows } = await query<StudentRow>(
      `SELECT ${SELECT_COLUMNS} FROM students WHERE refresh_token_hash = $1`,
      [hash],
    );
    const row = rows[0];
    return row ? toStudentWithSecrets(row) : null;
  },

  /** Persist (or, with `null`, revoke) the current refresh token. */
  async setRefreshToken(studentId: string, refreshTokenHash: string | null): Promise<void> {
    await query(
      `UPDATE students SET refresh_token_hash = $2, updated_at = now() WHERE id = $1`,
      [studentId, refreshTokenHash],
    );
  },

  /** Record a failed login and, at the threshold, set the lock expiry. */
  async recordFailedLogin(
    studentId: string,
    failedAttempts: number,
    lockedUntil: Date | null,
  ): Promise<void> {
    await query(
      `UPDATE students
         SET failed_attempts = $2, locked_until = $3, updated_at = now()
       WHERE id = $1`,
      [studentId, failedAttempts, lockedUntil],
    );
  },

  /** Clear lock state after a successful login. */
  async resetLoginFailures(studentId: string): Promise<void> {
    await query(
      `UPDATE students
         SET failed_attempts = 0, locked_until = NULL, updated_at = now()
       WHERE id = $1`,
      [studentId],
    );
  },

  // ==========================================
  // Account CRUD (admin portal)
  // ==========================================

  /** Paginated students of one institute (super admin: any institute). */
  async list(
    params: ListParams,
    scope: { instituteId: string | null },
  ): Promise<Paginated<AuthUser>> {
    const clauses = [
      scope.instituteId ? { sql: `institute_id = ?`, value: scope.instituteId } : null,
      params.q
        ? { sql: `(name ILIKE ? OR email ILIKE ?)`, value: `%${params.q}%` }
        : null,
    ];
    const items = buildListQuery({
      select: PUBLIC_COLUMNS,
      from: `students`,
      clauses,
      params,
      sortColumns: SORT_COLUMNS,
      idColumn: `id`,
    });
    const count = buildCountQuery(`students`, clauses);

    const [rowsResult, countResult] = await Promise.all([
      query<StudentPublicRow>(items.text, items.values),
      query<{ total: number }>(count.text, count.values),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return {
      items: rowsResult.rows.map(toStudent),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    };
  },

  /** Partial profile update. Duplicate email -> 23505 -> 409 upstream. */
  async update(
    id: string,
    fields: {
      name?: string;
      email?: string;
      passwordHash?: string;
      instituteId?: string;
    },
  ): Promise<AuthUser | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown): void => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };
    if (fields.name !== undefined) set(`name`, fields.name);
    if (fields.email !== undefined) set(`email`, fields.email);
    if (fields.passwordHash !== undefined) set(`password_hash`, fields.passwordHash);
    if (fields.instituteId !== undefined) set(`institute_id`, fields.instituteId);
    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await query<StudentPublicRow>(
      `UPDATE students SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${values.length}
       RETURNING ${PUBLIC_COLUMNS}`,
      values,
    );
    const row = rows[0];
    return row ? toStudent(row) : null;
  },

  /** Hard delete - applications/attempts/responses cascade. */
  async remove(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM students WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },

  /** Session invalidation on password change (Standards PDF 10). */
  async revokeSession(studentId: string): Promise<void> {
    await query(
      `UPDATE students SET refresh_token_hash = NULL, updated_at = now() WHERE id = $1`,
      [studentId],
    );
  },
};
