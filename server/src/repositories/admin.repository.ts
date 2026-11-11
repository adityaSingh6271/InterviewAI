import { query } from "../config/db";
import type { AdminRole, AuthUser, AuthUserWithSecrets } from "../types/auth.types";
import type { ListParams, Paginated } from "../types/entities.types";
import { buildCountQuery, buildListQuery } from "../utils/query.util";

/**
 * Admins repository - the only place SQL for the `admins` table lives
 * (PDF 3: repository pattern, raw SQL only here, no ORM).
 *
 * Auth queries (login/refresh/lockout) coexist with account CRUD: admins are
 * provisioned by other admins through `POST /admins`, never through the
 * public register endpoint. Same rules in every statement:
 * - explicit column lists, never `SELECT *` (PDF 4);
 * - `$1, $2, ...` placeholders, never string interpolation (PDF 4);
 * - columns are snake_case, mapped to camelCase domain fields on the way out;
 * - password and refresh-token material never leaves this file unmapped -
 *   `findByEmail`/`findByRefreshTokenHash` return the internal shape the auth
 *   service needs; everything else returns the public shape.
 */

/** All columns an auth read may need - kept explicit so new columns are opt-in. */
const SELECT_COLUMNS = `id, institute_id, name, email, password_hash, role, refresh_token_hash, failed_attempts, locked_until, created_at, updated_at`;

/** Public projection for list/read - never fetches secret material. */
const PUBLIC_COLUMNS = `id, institute_id, name, email, role, created_at, updated_at`;

const SORT_COLUMNS: Record<string, string> = {
  createdAt: "created_at",
  name: "name",
  email: "email",
  role: "role",
};

type AdminRow = {
  id: string;
  institute_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  refresh_token_hash: string | null;
  failed_attempts: number;
  locked_until: Date | null;
  created_at: Date;
  updated_at: Date;
};

type AdminPublicRow = Omit<
  AdminRow,
  "password_hash" | "refresh_token_hash" | "failed_attempts" | "locked_until"
>;

/** snake_case row -> camelCase domain object (public fields only). */
function toAdmin(row: AdminPublicRow): AuthUser {
  return {
    id: row.id,
    portal: "admin",
    name: row.name,
    email: row.email,
    instituteId: row.institute_id,
    adminRole: row.role as AdminRole,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** snake_case row -> internal object including secrets (service layer only). */
function toAdminWithSecrets(row: AdminRow): AuthUserWithSecrets {
  return {
    ...toAdmin(row),
    passwordHash: row.password_hash,
    refreshTokenHash: row.refresh_token_hash,
    failedAttempts: row.failed_attempts,
    lockedUntil: row.locked_until ? row.locked_until.toISOString() : null,
  };
}

export const adminRepository = {
  /** Look up credentials by email (citext = case-insensitive match). */
  async findByEmail(email: string): Promise<AuthUserWithSecrets | null> {
    const { rows } = await query<AdminRow>(
      `SELECT ${SELECT_COLUMNS} FROM admins WHERE email = $1`,
      [email],
    );
    const row = rows[0];
    return row ? toAdminWithSecrets(row) : null;
  },

  /** Public profile lookup - used by `protect` to resolve the session. */
  async findById(id: string): Promise<AuthUser | null> {
    const { rows } = await query<AdminRow>(
      `SELECT ${SELECT_COLUMNS} FROM admins WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toAdmin(row) : null;
  },

  /**
   * Resolve the admin behind a refresh token by its SHA-256 digest - the
   * raw token is never compared in SQL (PDF 10: tokens stored hashed).
   */
  async findByRefreshTokenHash(hash: string): Promise<AuthUserWithSecrets | null> {
    const { rows } = await query<AdminRow>(
      `SELECT ${SELECT_COLUMNS} FROM admins WHERE refresh_token_hash = $1`,
      [hash],
    );
    const row = rows[0];
    return row ? toAdminWithSecrets(row) : null;
  },

  /** Persist (or, with `null`, revoke) the current refresh token. */
  async setRefreshToken(adminId: string, refreshTokenHash: string | null): Promise<void> {
    await query(
      `UPDATE admins SET refresh_token_hash = $2, updated_at = now() WHERE id = $1`,
      [adminId, refreshTokenHash],
    );
  },

  /** Record a failed login and, at the threshold, set the lock expiry. */
  async recordFailedLogin(
    adminId: string,
    failedAttempts: number,
    lockedUntil: Date | null,
  ): Promise<void> {
    await query(
      `UPDATE admins
         SET failed_attempts = $2, locked_until = $3, updated_at = now()
       WHERE id = $1`,
      [adminId, failedAttempts, lockedUntil],
    );
  },

  /** Clear lock state after a successful login. */
  async resetLoginFailures(adminId: string): Promise<void> {
    await query(
      `UPDATE admins
         SET failed_attempts = 0, locked_until = NULL, updated_at = now()
       WHERE id = $1`,
      [adminId],
    );
  },

  /**
   * Dashboard counters for GET /admin/stats, scoped to the institutes the
   * acting admin may see: `instituteIds: null` means "every institute"
   * (SUPER_ADMIN), otherwise every row is filtered to that set (ORG_ADMIN's
   * organization / INSTITUTE_ADMIN's own institute). Six independent reads -
   * no N+1 - and the scope array is the only bound value.
   */
  async dashboardStats(scope: {
    instituteIds: string[] | null;
  }): Promise<{
    totalAdmins: number;
    totalStudents: number;
    totalInstitutes: number;
    interviewsByStatus: Record<string, number>;
    applicationsByStatus: Record<string, number>;
    attemptsByStatus: Record<string, number>;
  }> {
    const scoped = scope.instituteIds !== null;
    const values: unknown[] = scoped ? [scope.instituteIds] : [];
    /** `TRUE` (no tenant filter) or an `= ANY($1)` clause on `column`. */
    const where = (column: string): string =>
      scoped ? `${column} = ANY($1)` : `TRUE`;

    type ScalarRow = { total: number };
    type GroupRow = { status: string; total: number };

    const [admins, students, institutes, interviews, applications, attempts] =
      await Promise.all([
        query<ScalarRow>(
          `SELECT count(*)::int AS total FROM admins WHERE ${where(`institute_id`)}`,
          values,
        ),
        query<ScalarRow>(
          `SELECT count(*)::int AS total FROM students WHERE ${where(`institute_id`)}`,
          values,
        ),
        query<ScalarRow>(
          `SELECT count(*)::int AS total FROM institutes WHERE ${where(`id`)}`,
          values,
        ),
        query<GroupRow>(
          `SELECT status::text AS status, count(*)::int AS total
             FROM interviews
            WHERE ${where(`institute_id`)}
            GROUP BY status`,
          values,
        ),
        query<GroupRow>(
          `SELECT a.status::text AS status, count(*)::int AS total
             FROM student_applications a
             JOIN interviews i ON i.id = a.interview_id
            WHERE ${where(`i.institute_id`)}
            GROUP BY a.status`,
          values,
        ),
        query<GroupRow>(
          `SELECT ra.status::text AS status, count(*)::int AS total
             FROM round_attempts ra
             JOIN students s ON s.id = ra.student_id
            WHERE ${where(`s.institute_id`)}
            GROUP BY ra.status`,
          values,
        ),
      ]);

    const toMap = (rows: GroupRow[]): Record<string, number> =>
      Object.fromEntries(rows.map((row) => [row.status, row.total]));

    return {
      totalAdmins: admins.rows[0]?.total ?? 0,
      totalStudents: students.rows[0]?.total ?? 0,
      totalInstitutes: institutes.rows[0]?.total ?? 0,
      interviewsByStatus: toMap(interviews.rows),
      applicationsByStatus: toMap(applications.rows),
      attemptsByStatus: toMap(attempts.rows),
    };
  },

  // ==========================================
  // Account CRUD (admin-provisioned, not self-registered)
  // ==========================================

  /** Paginated accounts of one institute (super admin: any institute). */
  async list(
    params: ListParams,
    scope: { instituteId: string | null; allowedRoles?: string[] },
  ): Promise<Paginated<AuthUser>> {
    const clauses = [
      scope.instituteId ? { sql: `institute_id = ?`, value: scope.instituteId } : null,
      scope.allowedRoles && scope.allowedRoles.length > 0
        ? { sql: `role::text = ANY(?)`, value: scope.allowedRoles }
        : null,
      params.q
        ? { sql: `(name ILIKE ? OR email ILIKE ?)`, value: `%${params.q}%` }
        : null,
    ];
    const items = buildListQuery({
      select: PUBLIC_COLUMNS,
      from: `admins`,
      clauses,
      params,
      sortColumns: SORT_COLUMNS,
      idColumn: `id`,
    });
    const count = buildCountQuery(`admins`, clauses);

    const [rowsResult, countResult] = await Promise.all([
      query<AdminPublicRow>(items.text, items.values),
      query<{ total: number }>(count.text, count.values),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return {
      items: rowsResult.rows.map(toAdmin),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    };
  },

  /**
   * Provision an admin account. A duplicate email violates UNIQUE (23505),
   * which the service maps to 409.
   */
  async create(input: {
    id: string;
    instituteId: string;
    name: string;
    email: string;
    passwordHash: string;
    role: AdminRole;
  }): Promise<AuthUser> {
    const { rows } = await query<AdminPublicRow>(
      `INSERT INTO admins (id, institute_id, name, email, password_hash, role, failed_attempts, locked_until)
       VALUES ($1, $2, $3, $4, $5, $6, 0, NULL)
       RETURNING ${PUBLIC_COLUMNS}`,
      [
        input.id,
        input.instituteId,
        input.name,
        input.email,
        input.passwordHash,
        input.role,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("INSERT returned no row");
    return toAdmin(row);
  },

  /**
   * Partial account update. `passwordHash` rotates the stored bcrypt hash;
   * callers revoke sessions separately (see `revokeSession`).
   */
  async update(
    id: string,
    fields: {
      name?: string;
      email?: string;
      passwordHash?: string;
      role?: AdminRole;
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
    if (fields.role !== undefined) set(`role`, fields.role);
    if (fields.instituteId !== undefined) set(`institute_id`, fields.instituteId);
    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await query<AdminPublicRow>(
      `UPDATE admins SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${values.length}
       RETURNING ${PUBLIC_COLUMNS}`,
      values,
    );
    const row = rows[0];
    return row ? toAdmin(row) : null;
  },

  /** Hard delete (institute FK cascades nothing upward - admins are leaves). */
  async remove(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM admins WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },

  /** Session invalidation on password change (Standards PDF 10). */
  async revokeSession(adminId: string): Promise<void> {
    await query(
      `UPDATE admins SET refresh_token_hash = NULL, updated_at = now() WHERE id = $1`,
      [adminId],
    );
  },
};
