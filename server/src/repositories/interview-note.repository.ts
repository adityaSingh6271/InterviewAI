import { query } from "../config/db";
import type { InterviewNote, ListParams, Paginated } from "../types/entities.types";
import { buildCountQuery, buildListQuery } from "../utils/query.util";

/**
 * Interview notes repository (PDF 3: raw SQL only, explicit columns, `$n`
 * placeholders). Notes hang off an interview and optionally off one of its
 * rounds; the author id is stored without a FK because the author may live
 * in either portal's table.
 */

const SELECT_COLUMNS = `n.id, n.interview_id, n.round_id, n.content, n.created_by, n.created_at, n.updated_at`;

const SORT_COLUMNS: Record<string, string> = {
  createdAt: "n.created_at",
};

type NoteRow = {
  id: string;
  interview_id: string;
  round_id: string | null;
  content: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
};

function toNote(row: NoteRow): InterviewNote {
  return {
    id: row.id,
    interviewId: row.interview_id,
    roundId: row.round_id,
    content: row.content,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const interviewNoteRepository = {
  /** Notes of one interview, newest first by default (caller sets order). */
  async listByInterview(
    interviewId: string,
    params: ListParams,
  ): Promise<Paginated<InterviewNote>> {
    const clauses = [{ sql: `n.interview_id = ?`, value: interviewId }];
    const items = buildListQuery({
      select: SELECT_COLUMNS,
      from: `interview_notes n`,
      clauses,
      params,
      sortColumns: SORT_COLUMNS,
      idColumn: `n.id`,
    });
    const count = buildCountQuery(`interview_notes n`, clauses);

    const [rowsResult, countResult] = await Promise.all([
      query<NoteRow>(items.text, items.values),
      query<{ total: number }>(count.text, count.values),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return {
      items: rowsResult.rows.map(toNote),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    };
  },

  async findById(id: string): Promise<InterviewNote | null> {
    const { rows } = await query<NoteRow>(
      `SELECT ${SELECT_COLUMNS} FROM interview_notes n WHERE n.id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toNote(row) : null;
  },

  async create(input: {
    id: string;
    interviewId: string;
    roundId: string | null;
    content: string;
    createdBy: string;
  }): Promise<InterviewNote> {
    const { rows } = await query<NoteRow>(
      `INSERT INTO interview_notes (id, interview_id, round_id, content, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SELECT_COLUMNS.replace(/n\./g, "")}`,
      [input.id, input.interviewId, input.roundId, input.content, input.createdBy],
    );
    const row = rows[0];
    if (!row) throw new Error("INSERT returned no row");
    return toNote(row);
  },

  async remove(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM interview_notes WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },
};
