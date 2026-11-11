import { query } from "../config/db";
import type {
  Difficulty,
  InterviewStatus,
  ListParams,
  Paginated,
  Question,
} from "../types/entities.types";
import { buildCountQuery, buildListQuery } from "../utils/query.util";

/**
 * Questions repository (PDF 3: raw SQL only, explicit columns, `$n`
 * placeholders). Scoped reads join `rounds` + `interviews` to resolve the
 * tenant and interview status in one statement (no N+1).
 */

const SELECT_COLUMNS = `q.id, q.round_id, q.prompt, q.expected_keywords, q.difficulty, q.created_at, q.updated_at`;

const SORT_COLUMNS: Record<string, string> = {
  createdAt: "q.created_at",
  difficulty: "q.difficulty",
};

type QuestionRow = {
  id: string;
  round_id: string;
  prompt: string;
  expected_keywords: string[] | null;
  difficulty: Difficulty;
  created_at: Date;
  updated_at: Date;
};

function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    roundId: row.round_id,
    prompt: row.prompt,
    expectedKeywords: row.expected_keywords,
    difficulty: row.difficulty,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

type ScopedRow = QuestionRow & {
  scope_institute_id: string;
  interview_status: InterviewStatus;
};

export type QuestionScope = {
  question: Question;
  instituteId: string;
  interviewStatus: InterviewStatus;
};

const SCOPE_FROM = `questions q
  JOIN rounds r ON r.id = q.round_id
  JOIN interviews i ON i.id = r.interview_id`;
const SCOPE_COLUMNS = `, i.institute_id AS scope_institute_id, i.status AS interview_status`;

export const questionRepository = {
  async listByRound(roundId: string, params: ListParams): Promise<Paginated<Question>> {
    const clauses = [{ sql: `q.round_id = ?`, value: roundId }];
    const items = buildListQuery({
      select: SELECT_COLUMNS,
      from: `questions q`,
      clauses,
      params,
      sortColumns: SORT_COLUMNS,
      idColumn: `q.id`,
    });
    const count = buildCountQuery(`questions q`, clauses);

    const [rowsResult, countResult] = await Promise.all([
      query<QuestionRow>(items.text, items.values),
      query<{ total: number }>(count.text, count.values),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return {
      items: rowsResult.rows.map(toQuestion),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    };
  },

  async findById(id: string): Promise<Question | null> {
    const { rows } = await query<QuestionRow>(
      `SELECT ${SELECT_COLUMNS} FROM questions q WHERE q.id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toQuestion(row) : null;
  },

  /** Scoped read - exposes the owning institute + interview status. */
  async findByIdWithScope(id: string): Promise<QuestionScope | null> {
    const { rows } = await query<ScopedRow>(
      `SELECT ${SELECT_COLUMNS}${SCOPE_COLUMNS} FROM ${SCOPE_FROM} WHERE q.id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      question: toQuestion(row),
      instituteId: row.scope_institute_id,
      interviewStatus: row.interview_status,
    };
  },

  async create(input: {
    id: string;
    roundId: string;
    prompt: string;
    expectedKeywords: string[] | null;
    difficulty: Difficulty;
  }): Promise<Question> {
    const { rows } = await query<QuestionRow>(
      `INSERT INTO questions (id, round_id, prompt, expected_keywords, difficulty)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING ${SELECT_COLUMNS.replace(/q\./g, "")}`,
      [
        input.id,
        input.roundId,
        input.prompt,
        input.expectedKeywords === null ? null : JSON.stringify(input.expectedKeywords),
        input.difficulty,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("INSERT returned no row");
    return toQuestion(row);
  },

  /**
   * Bulk insert (preview-then-commit). One multi-row INSERT is atomic by
   * itself; RETURNING rows are mapped back to the caller's input order so
   * preview order survives the round trip.
   */
  async createBatch(
    input: Array<{
      id: string;
      roundId: string;
      prompt: string;
      expectedKeywords: string[] | null;
      difficulty: Difficulty;
    }>,
  ): Promise<Question[]> {
    if (input.length === 0) return [];
    const values: unknown[] = [];
    const tuples: string[] = [];
    for (const item of input) {
      values.push(
        item.id,
        item.roundId,
        item.prompt,
        item.expectedKeywords === null ? null : JSON.stringify(item.expectedKeywords),
        item.difficulty,
      );
      const base = values.length - 5;
      tuples.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::jsonb, $${base + 5})`,
      );
    }
    const { rows } = await query<QuestionRow>(
      `INSERT INTO questions (id, round_id, prompt, expected_keywords, difficulty)
       VALUES ${tuples.join(", ")}
       RETURNING ${SELECT_COLUMNS.replace(/q\./g, "")}`,
      values,
    );
    const byId = new Map(rows.map((row) => [row.id, toQuestion(row)]));
    return input.map((item) => {
      const question = byId.get(item.id);
      if (!question) throw new Error("INSERT returned no row for " + item.id);
      return question;
    });
  },

  async update(
    id: string,
    fields: {
      prompt?: string;
      expectedKeywords?: string[] | null;
      difficulty?: Difficulty;
    },
  ): Promise<Question | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown, cast = ""): void => {
      values.push(value);
      sets.push(`${column} = $${values.length}${cast}`);
    };
    if (fields.prompt !== undefined) set(`prompt`, fields.prompt);
    if (fields.expectedKeywords !== undefined) {
      set(
        `expected_keywords`,
        fields.expectedKeywords === null ? null : JSON.stringify(fields.expectedKeywords),
        `::jsonb`,
      );
    }
    if (fields.difficulty !== undefined) set(`difficulty`, fields.difficulty);
    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await query<QuestionRow>(
      `UPDATE questions SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${values.length}
       RETURNING ${SELECT_COLUMNS.replace(/q\./g, "")}`,
      values,
    );
    const row = rows[0];
    return row ? toQuestion(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM questions WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },
};
