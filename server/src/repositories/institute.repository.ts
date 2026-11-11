import { query } from "../config/db";
import type { Institute, ListParams, Paginated } from "../types/entities.types";
import { buildCountQuery, buildListQuery } from "../utils/query.util";

/**
 * Institutes repository - the only place SQL for the `institutes` table lives
 * (PDF 3: raw SQL only, explicit columns, `$n` placeholders).
 *
 * Besides student self-registration (findByJoinCode) it backs the institute
 * CRUD: scoped listing (organization / own-institute), create with a unique
 * invite code, partial update, and cascade-aware delete.
 */

const SELECT_COLUMNS = `id, organization_id, name, join_code, created_at, updated_at`;

const SORT_COLUMNS: Record<string, string> = {
  createdAt: "created_at",
  name: "name",
};

type InstituteRow = {
  id: string;
  organization_id: string;
  name: string;
  join_code: string;
  created_at: Date;
  updated_at: Date;
};

function toInstitute(row: InstituteRow): Institute {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    joinCode: row.join_code,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const instituteRepository = {
  /** Resolve an institute by its invite code (case-insensitive match). */
  async findByJoinCode(joinCode: string): Promise<{ id: string; name: string } | null> {
    const { rows } = await query<{ id: string; name: string }>(
      `SELECT id, name FROM institutes WHERE upper(join_code) = upper($1)`,
      [joinCode],
    );
    return rows[0] ?? null;
  },

  /**
   * Paginated list.
   * @param scope.organizationId - restrict to one organization
   * @param scope.instituteId - restrict to exactly one institute
   * @param scope.q - optional name/invite-code search
   */
  async list(
    params: ListParams,
    scope: { organizationId?: string | null; instituteId?: string | null } = {},
  ): Promise<Paginated<Institute>> {
    const clauses = [
      scope.organizationId ? { sql: `organization_id = ?`, value: scope.organizationId } : null,
      scope.instituteId ? { sql: `id = ?`, value: scope.instituteId } : null,
      params.q
        ? { sql: `(name ILIKE ? OR join_code ILIKE ?)`, value: `%${params.q}%` }
        : null,
    ];
    const items = buildListQuery({
      select: SELECT_COLUMNS,
      from: `institutes`,
      clauses,
      params,
      sortColumns: SORT_COLUMNS,
      idColumn: `id`,
    });
    const count = buildCountQuery(`institutes`, clauses);

    const [rowsResult, countResult] = await Promise.all([
      query<InstituteRow>(items.text, items.values),
      query<{ total: number }>(count.text, count.values),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return {
      items: rowsResult.rows.map(toInstitute),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    };
  },

  async findById(id: string): Promise<Institute | null> {
    const { rows } = await query<InstituteRow>(
      `SELECT ${SELECT_COLUMNS} FROM institutes WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toInstitute(row) : null;
  },

  /** Organization of one institute - used for ORG_ADMIN scoping. */
  async findOrganizationId(instituteId: string): Promise<string | null> {
    const { rows } = await query<{ organization_id: string }>(
      `SELECT organization_id FROM institutes WHERE id = $1`,
      [instituteId],
    );
    return rows[0]?.organization_id ?? null;
  },

  /** Ids of every institute under one organization (ORG_ADMIN scope sets). */
  async listIdsByOrganization(organizationId: string): Promise<string[]> {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM institutes WHERE organization_id = $1 ORDER BY id`,
      [organizationId],
    );
    return rows.map((row) => row.id);
  },

  async create(input: {
    id: string;
    organizationId: string;
    name: string;
    joinCode: string;
  }): Promise<Institute> {
    const { rows } = await query<InstituteRow>(
      `INSERT INTO institutes (id, organization_id, name, join_code)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SELECT_COLUMNS}`,
      [input.id, input.organizationId, input.name, input.joinCode],
    );
    const row = rows[0];
    if (!row) throw new Error("INSERT returned no row");
    return toInstitute(row);
  },

  async update(
    id: string,
    fields: { name?: string; joinCode?: string; organizationId?: string },
  ): Promise<Institute | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown): void => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };
    if (fields.name !== undefined) set(`name`, fields.name);
    if (fields.joinCode !== undefined) set(`join_code`, fields.joinCode);
    if (fields.organizationId !== undefined) set(`organization_id`, fields.organizationId);
    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await query<InstituteRow>(
      `UPDATE institutes SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${values.length}
       RETURNING ${SELECT_COLUMNS}`,
      values,
    );
    const row = rows[0];
    return row ? toInstitute(row) : null;
  },

  /** Hard delete - admins/students/interviews of the institute cascade. */
  async remove(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM institutes WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },
};
