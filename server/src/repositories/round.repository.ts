import { query } from "../config/db";
import type {
  InterviewStatus,
  ListParams,
  Paginated,
  Round,
  RoundType,
} from "../types/entities.types";
import { buildCountQuery, buildListQuery } from "../utils/query.util";

/**
 * Rounds repository (PDF 3: raw SQL only, explicit columns, `$n`
 * placeholders). Scoped reads join `interviews` to resolve tenant scope and
 * the interview status (students may only read rounds of published
 * interviews).
 */

const SELECT_COLUMNS = `r.id, r.interview_id, r.name, r.sequence_order, r.round_type,
  r.description, r.estimated_duration_minutes, r.client_type, r.created_at, r.updated_at`;

const SORT_COLUMNS: Record<string, string> = {
  sequenceOrder: "r.sequence_order",
  createdAt: "r.created_at",
  name: "r.name",
};

type RoundRow = {
  id: string;
  interview_id: string;
  name: string;
  sequence_order: number;
  round_type: RoundType;
  description: string | null;
  estimated_duration_minutes: number | null;
  client_type: string | null;
  created_at: Date;
  updated_at: Date;
};

function toRound(row: RoundRow): Round {
  return {
    id: row.id,
    interviewId: row.interview_id,
    name: row.name,
    sequenceOrder: row.sequence_order,
    roundType: row.round_type,
    description: row.description ?? "",
    estimatedDurationMinutes: row.estimated_duration_minutes,
    clientType: row.client_type,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

type ScopedRow = RoundRow & {
  scope_institute_id: string;
  interview_status: InterviewStatus;
};

export type RoundScope = {
  round: Round;
  instituteId: string;
  interviewStatus: InterviewStatus;
};

const SCOPE_FROM = `rounds r JOIN interviews i ON i.id = r.interview_id`;
const SCOPE_COLUMNS = `, i.institute_id AS scope_institute_id, i.status AS interview_status`;

export const roundRepository = {
  /** Rounds of one interview, ordered by sequence (deterministic). */
  async listByInterview(
    interviewId: string,
    params: ListParams,
  ): Promise<Paginated<Round>> {
    const clauses = [{ sql: `r.interview_id = ?`, value: interviewId }];
    const items = buildListQuery({
      select: SELECT_COLUMNS,
      from: `rounds r`,
      clauses,
      params,
      sortColumns: SORT_COLUMNS,
      idColumn: `r.id`,
    });
    const count = buildCountQuery(`rounds r`, clauses);

    const [rowsResult, countResult] = await Promise.all([
      query<RoundRow>(items.text, items.values),
      query<{ total: number }>(count.text, count.values),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return {
      items: rowsResult.rows.map(toRound),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    };
  },

  async findById(id: string): Promise<Round | null> {
    const { rows } = await query<RoundRow>(
      `SELECT ${SELECT_COLUMNS} FROM rounds r WHERE r.id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toRound(row) : null;
  },

  /** Scoped read - exposes the owning institute + interview status. */
  async findByIdWithScope(id: string): Promise<RoundScope | null> {
    const { rows } = await query<ScopedRow>(
      `SELECT ${SELECT_COLUMNS}${SCOPE_COLUMNS} FROM ${SCOPE_FROM} WHERE r.id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      round: toRound(row),
      instituteId: row.scope_institute_id,
      interviewStatus: row.interview_status,
    };
  },

  async create(input: {
    id: string;
    interviewId: string;
    name: string;
    sequenceOrder: number;
    roundType: RoundType;
    description?: string;
    estimatedDurationMinutes?: number | null;
    clientType?: string | null;
  }): Promise<Round> {
    const { rows } = await query<RoundRow>(
      `INSERT INTO rounds (id, interview_id, name, sequence_order, round_type,
         description, estimated_duration_minutes, client_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${SELECT_COLUMNS.replace(/r\./g, "")}`,
      [
        input.id,
        input.interviewId,
        input.name,
        input.sequenceOrder,
        input.roundType,
        input.description ?? "",
        input.estimatedDurationMinutes ?? null,
        input.clientType ?? null,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("INSERT returned no row");
    return toRound(row);
  },

  async update(
    id: string,
    fields: {
      name?: string;
      sequenceOrder?: number;
      roundType?: RoundType;
      description?: string;
      estimatedDurationMinutes?: number | null;
      clientType?: string | null;
    },
  ): Promise<Round | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown): void => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };
    if (fields.name !== undefined) set(`name`, fields.name);
    if (fields.sequenceOrder !== undefined) set(`sequence_order`, fields.sequenceOrder);
    if (fields.roundType !== undefined) set(`round_type`, fields.roundType);
    if (fields.description !== undefined) set(`description`, fields.description);
    if (fields.estimatedDurationMinutes !== undefined) {
      set(`estimated_duration_minutes`, fields.estimatedDurationMinutes);
    }
    if (fields.clientType !== undefined) set(`client_type`, fields.clientType);
    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await query<RoundRow>(
      `UPDATE rounds SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${values.length}
       RETURNING ${SELECT_COLUMNS.replace(/r\./g, "")}`,
      values,
    );
    const row = rows[0];
    return row ? toRound(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM rounds WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },
};
