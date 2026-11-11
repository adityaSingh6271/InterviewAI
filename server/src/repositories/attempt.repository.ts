import { query } from "../config/db";
import type {
  AttemptStatus,
  InterviewStatus,
  ListParams,
  Paginated,
  RoundAttempt,
} from "../types/entities.types";
import { buildCountQuery, buildListQuery } from "../utils/query.util";

/**
 * Round attempts repository (PDF 3: raw SQL only, explicit columns, `$n`
 * placeholders). Scoped reads join `rounds` + `interviews` for tenant
 * scope; `attempt_number` is allocated inside the INSERT (INSERT ... SELECT)
 * so concurrent starts cannot collide between a read and a write.
 */

const SELECT_COLUMNS = `a.id, a.round_id, a.student_id, a.attempt_number, a.status, a.started_at, a.submitted_at, a.created_at, a.updated_at`;

/**
 * Attempt list aggregates: the average AI score across the attempt's scored
 * responses, and the examiner feedback of the strongest one (the report
 * summary). Both are NULL until inline/admin evaluation has run.
 */
const SELECT_AGGREGATES = `, COALESCE((SELECT ROUND(AVG(rp.ai_score)) FROM responses rp WHERE rp.round_attempt_id = a.id AND rp.ai_score IS NOT NULL), NULL) AS ai_score
  , (SELECT rp.ai_feedback FROM responses rp WHERE rp.round_attempt_id = a.id AND rp.ai_score IS NOT NULL ORDER BY rp.ai_score DESC, rp.created_at ASC LIMIT 1) AS ai_feedback`;

const SORT_COLUMNS: Record<string, string> = {
  startedAt: "a.started_at",
  createdAt: "a.created_at",
  status: "a.status",
};

type AttemptRow = {
  id: string;
  round_id: string;
  student_id: string;
  attempt_number: number;
  status: AttemptStatus;
  started_at: Date;
  submitted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  ai_score: number | null;
  ai_feedback: string | null;
};

function toAttempt(row: AttemptRow): RoundAttempt {
  return {
    id: row.id,
    roundId: row.round_id,
    studentId: row.student_id,
    attemptNumber: row.attempt_number,
    status: row.status,
    startedAt: row.started_at.toISOString(),
    submittedAt: row.submitted_at ? row.submitted_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    aiScore: row.ai_score,
    aiFeedback: row.ai_feedback,
  };
}

type ScopedRow = AttemptRow & {
  scope_institute_id: string;
  interview_status: InterviewStatus;
};
export type AttemptScope = {
  attempt: RoundAttempt;
  instituteId: string;
  interviewStatus: InterviewStatus;
};

const SCOPE_FROM = `round_attempts a
  JOIN rounds r ON r.id = a.round_id
  JOIN interviews i ON i.id = r.interview_id`;
const SCOPE_COLUMNS = `, i.institute_id AS scope_institute_id, i.status AS interview_status`;

export const attemptRepository = {
  /**
   * Paginated attempts.
   * @param scope.roundId - one round (admin pipeline view)
   * @param scope.studentId - one student's attempts (self or admin)
   * @param scope.interviewId - one interview via its rounds (workspace view)
   * @param scope.instituteId - institute restriction (null = unrestricted)
   */
  async list(
    params: ListParams,
    scope: {
      roundId?: string;
      studentId?: string;
      interviewId?: string;
      instituteId: string | null;
      status?: AttemptStatus;
    },
  ): Promise<Paginated<RoundAttempt>> {
    const clauses = [
      scope.roundId ? { sql: `a.round_id = ?`, value: scope.roundId } : null,
      scope.studentId ? { sql: `a.student_id = ?`, value: scope.studentId } : null,
      scope.interviewId ? { sql: `r.interview_id = ?`, value: scope.interviewId } : null,
      scope.instituteId ? { sql: `i.institute_id = ?`, value: scope.instituteId } : null,
      scope.status ? { sql: `a.status = ?`, value: scope.status } : null,
    ];
    const items = buildListQuery({
      select: `${SELECT_COLUMNS}${SELECT_AGGREGATES}`,
      from: SCOPE_FROM,
      clauses,
      params,
      sortColumns: SORT_COLUMNS,
      idColumn: `a.id`,
    });
    const count = buildCountQuery(SCOPE_FROM, clauses);

    const [rowsResult, countResult] = await Promise.all([
      query<AttemptRow>(items.text, items.values),
      query<{ total: number }>(count.text, count.values),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return {
      items: rowsResult.rows.map(toAttempt),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    };
  },

  async findById(id: string): Promise<RoundAttempt | null> {
    const { rows } = await query<AttemptRow>(
      `SELECT ${SELECT_COLUMNS}${SELECT_AGGREGATES} FROM round_attempts a WHERE a.id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toAttempt(row) : null;
  },

  /** Scoped read - exposes tenant + interview status for authorization. */
  async findByIdWithScope(id: string): Promise<AttemptScope | null> {
    const { rows } = await query<ScopedRow>(
      `SELECT ${SELECT_COLUMNS}${SELECT_AGGREGATES}${SCOPE_COLUMNS} FROM ${SCOPE_FROM} WHERE a.id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      attempt: toAttempt(row),
      instituteId: row.scope_institute_id,
      interviewStatus: row.interview_status,
    };
  },

  /**
   * Start an attempt: allocates `attempt_number = MAX(...) + 1` for this
   * (round, student) in a single INSERT ... SELECT - no read/write race.
   * A duplicate concurrent start violates the UNIQUE key (23505) and is
   * mapped to 409 by the service.
   */
  async create(input: {
    id: string;
    roundId: string;
    studentId: string;
  }): Promise<RoundAttempt> {
    const { rows } = await query<AttemptRow>(
      `INSERT INTO round_attempts (id, round_id, student_id, attempt_number)
       SELECT $1, $2, $3, COALESCE(MAX(attempt_number), 0) + 1
       FROM round_attempts
       WHERE round_id = $2 AND student_id = $3
       RETURNING id, round_id, student_id, attempt_number, status, started_at, submitted_at, created_at, updated_at`,
      [input.id, input.roundId, input.studentId],
    );
    const row = rows[0];
    if (!row) throw new Error("INSERT returned no row");
    return toAttempt(row);
  },

  /**
   * Status transition. `submitted_at` is stamped (once) on the first move
   * out of IN_PROGRESS so the server clock is authoritative; validation only
   * permits COMPLETED/EVALUATED targets, so no transition can un-stamp it.
   */
  async updateStatus(id: string, status: AttemptStatus): Promise<RoundAttempt | null> {
    const { rows } = await query<AttemptRow>(
      `UPDATE round_attempts
         SET status = $2,
             submitted_at = COALESCE(submitted_at, now()),
             updated_at = now()
       WHERE id = $1
       RETURNING id, round_id, student_id, attempt_number, status, started_at, submitted_at, created_at, updated_at`,
      [id, status],
    );
    const row = rows[0];
    return row ? toAttempt(row) : null;
  },

  /**
   * Close out any abandoned IN_PROGRESS attempts for (round, student) before
   * starting a fresh attempt: deletes empty attempts (0 responses) and marks
   * partially answered ones as COMPLETED so history is preserved without blocking
   * unlimited retakes.
   */
  async finalizeStaleInProgress(roundId: string, studentId: string): Promise<void> {
    await query(
      `DELETE FROM round_attempts a
       WHERE a.round_id = $1
         AND a.student_id = $2
         AND a.status = 'IN_PROGRESS'
         AND NOT EXISTS (
           SELECT 1 FROM responses r WHERE r.round_attempt_id = a.id
         )`,
      [roundId, studentId],
    );
    await query(
      `UPDATE round_attempts
       SET status = 'COMPLETED',
           submitted_at = COALESCE(submitted_at, now()),
           updated_at = now()
       WHERE round_id = $1
         AND student_id = $2
         AND status = 'IN_PROGRESS'`,
      [roundId, studentId],
    );
  },

  /** An in-progress attempt lookup helper. */
  async findInProgress(roundId: string, studentId: string): Promise<RoundAttempt | null> {
    const { rows } = await query<AttemptRow>(
      `SELECT ${SELECT_COLUMNS} FROM round_attempts a
       WHERE a.round_id = $1 AND a.student_id = $2 AND a.status = 'IN_PROGRESS'
       LIMIT 1`,
      [roundId, studentId],
    );
    const row = rows[0];
    return row ? toAttempt(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM round_attempts WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },
};
