import { query } from "../config/db";
import type {
  AttemptStatus,
  InterviewResponse,
  ListParams,
  Paginated,
} from "../types/entities.types";
import { buildCountQuery, buildListQuery } from "../utils/query.util";

/**
 * Responses repository (PDF 3: raw SQL only, explicit columns, `$n`
 * placeholders). Scoped reads join `round_attempts` + `rounds` + `interviews`
 * so one statement yields the owner student, tenant, and attempt status for
 * authorization.
 */

const SELECT_COLUMNS = `rp.id, rp.round_attempt_id, rp.question_id, rp.transcript, rp.ai_score, rp.ai_feedback, rp.submitted_at, rp.created_at, rp.updated_at`;

const SORT_COLUMNS: Record<string, string> = {
  submittedAt: "rp.submitted_at",
  createdAt: "rp.created_at",
};

type ResponseRow = {
  id: string;
  round_attempt_id: string;
  question_id: string;
  transcript: string | null;
  ai_score: number | null;
  ai_feedback: string | null;
  submitted_at: Date;
  created_at: Date;
  updated_at: Date;
};

function toResponse(row: ResponseRow): InterviewResponse {
  return {
    id: row.id,
    roundAttemptId: row.round_attempt_id,
    questionId: row.question_id,
    transcript: row.transcript,
    aiScore: row.ai_score,
    aiFeedback: row.ai_feedback,
    submittedAt: row.submitted_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

type ScopedRow = ResponseRow & {
  owner_student_id: string;
  scope_institute_id: string;
  attempt_status: AttemptStatus;
  attempt_round_id: string;
};

export type ResponseScope = {
  response: InterviewResponse;
  /** Student that owns the underlying attempt. */
  studentId: string;
  instituteId: string;
  attemptStatus: AttemptStatus;
  roundId: string;
};

/** One response paired with its question - the AI evaluation workload. */
export type EvaluationItem = {
  responseId: string;
  questionId: string;
  transcript: string | null;
  prompt: string;
  expectedKeywords: string[] | null;
  difficulty: string;
};

const SCOPE_FROM = `responses rp
  JOIN round_attempts a ON a.id = rp.round_attempt_id
  JOIN rounds r ON r.id = a.round_id
  JOIN interviews i ON i.id = r.interview_id`;
const SCOPE_COLUMNS = `, a.student_id AS owner_student_id, i.institute_id AS scope_institute_id,
  a.status AS attempt_status, a.round_id AS attempt_round_id`;

export const responseRepository = {
  /** Responses of one attempt, newest first by default. */
  async listByAttempt(
    attemptId: string,
    params: ListParams,
  ): Promise<Paginated<InterviewResponse>> {
    const clauses = [{ sql: `rp.round_attempt_id = ?`, value: attemptId }];
    const items = buildListQuery({
      select: SELECT_COLUMNS,
      from: `responses rp`,
      clauses,
      params,
      sortColumns: SORT_COLUMNS,
      idColumn: `rp.id`,
    });
    const count = buildCountQuery(`responses rp`, clauses);

    const [rowsResult, countResult] = await Promise.all([
      query<ResponseRow>(items.text, items.values),
      query<{ total: number }>(count.text, count.values),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return {
      items: rowsResult.rows.map(toResponse),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    };
  },

  async findById(id: string): Promise<InterviewResponse | null> {
    const { rows } = await query<ResponseRow>(
      `SELECT ${SELECT_COLUMNS} FROM responses rp WHERE rp.id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toResponse(row) : null;
  },

  /** Scoped read - owner student, tenant, and attempt state in one query. */
  async findByIdWithScope(id: string): Promise<ResponseScope | null> {
    const { rows } = await query<ScopedRow>(
      `SELECT ${SELECT_COLUMNS}${SCOPE_COLUMNS} FROM ${SCOPE_FROM} WHERE rp.id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      response: toResponse(row),
      studentId: row.owner_student_id,
      instituteId: row.scope_institute_id,
      attemptStatus: row.attempt_status,
      roundId: row.attempt_round_id,
    };
  },

  /**
   * One response per question per attempt (UNIQUE - duplicate submit maps
   * to 409 via SQLSTATE 23505).
   */
  async create(input: {
    id: string;
    roundAttemptId: string;
    questionId: string;
    transcript?: string | null;
  }): Promise<InterviewResponse> {
    const { rows } = await query<ResponseRow>(
      `INSERT INTO responses (id, round_attempt_id, question_id, transcript)
       VALUES ($1, $2, $3, $4)
       RETURNING id, round_attempt_id, question_id, transcript, ai_score, ai_feedback, submitted_at, created_at, updated_at`,
      [input.id, input.roundAttemptId, input.questionId, input.transcript ?? null],
    );
    const row = rows[0];
    if (!row) throw new Error("INSERT returned no row");
    return toResponse(row);
  },

  async update(
    id: string,
    fields: {
      transcript?: string | null;
      aiScore?: number | null;
      aiFeedback?: string | null;
    },
  ): Promise<InterviewResponse | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown): void => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };
    if (fields.transcript !== undefined) set(`transcript`, fields.transcript);
    if (fields.aiScore !== undefined) set(`ai_score`, fields.aiScore);
    if (fields.aiFeedback !== undefined) set(`ai_feedback`, fields.aiFeedback);
    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await query<ResponseRow>(
      `UPDATE responses SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${values.length}
       RETURNING id, round_attempt_id, question_id, transcript, ai_score, ai_feedback, submitted_at, created_at, updated_at`,
      values,
    );
    const row = rows[0];
    return row ? toResponse(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM responses WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },

  /** Does this question belong to the attempt's round? (answer pre-check) */
  async questionBelongsToRound(questionId: string, roundId: string): Promise<boolean> {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM questions WHERE id = $1 AND round_id = $2`,
      [questionId, roundId],
    );
    return rows.length > 0;
  },

  /**
   * Everything the AI evaluator needs for one attempt, in a single query:
   * the response rows joined to their question's prompt/keywords/difficulty
   * (PDF 3: no N+1; ordered by creation so evaluation follows question order).
   */
  async listForEvaluation(attemptId: string): Promise<EvaluationItem[]> {
    const { rows } = await query<{
      response_id: string;
      question_id: string;
      transcript: string | null;
      prompt: string;
      expected_keywords: string[] | null;
      difficulty: string;
    }>(
      `SELECT rp.id AS response_id, rp.question_id, rp.transcript,
              q.prompt, q.expected_keywords, q.difficulty
       FROM responses rp
       JOIN questions q ON q.id = rp.question_id
       WHERE rp.round_attempt_id = $1
       ORDER BY rp.created_at ASC`,
      [attemptId],
    );
    return rows.map((row) => ({
      responseId: row.response_id,
      questionId: row.question_id,
      transcript: row.transcript,
      prompt: row.prompt,
      expectedKeywords: row.expected_keywords,
      difficulty: row.difficulty,
    }));
  },
};
