import { query } from "../config/db";
import type { ListParams, Organization, Paginated } from "../types/entities.types";
import { buildCountQuery, buildListQuery } from "../utils/query.util";

/**
 * Organizations repository - the only place SQL for the `organizations`
 * table lives (PDF 3: repository pattern, raw SQL only, no ORM).
 *
 * Rules honoured by every statement below:
 * - explicit column lists, never `SELECT *` (PDF 4);
 * - `$1, $2, ...` placeholders, never string interpolation (PDF 4);
 * - snake_case columns mapped to camelCase domain fields on the way out;
 * - dynamic list filters/sorts go through the allowlisted query builder.
 */

const SELECT_COLUMNS = `id, name, created_at, updated_at`;

/** Allowlist: validation `sort` keys -> real columns (Standards PDF 27). */
const SORT_COLUMNS: Record<string, string> = {
  createdAt: "created_at",
  name: "name",
};

type OrganizationRow = {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
};

function toOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const organizationRepository = {
  /** Paginated list with optional `q` name search. */
  async list(params: ListParams): Promise<Paginated<Organization>> {
    const clauses = params.q
      ? [{ sql: `name ILIKE ?`, value: `%${params.q}%` }]
      : [];
    const items = buildListQuery({
      select: SELECT_COLUMNS,
      from: `organizations`,
      clauses,
      params,
      sortColumns: SORT_COLUMNS,
      idColumn: `id`,
    });
    const count = buildCountQuery(`organizations`, clauses);

    const [rowsResult, countResult] = await Promise.all([
      query<OrganizationRow>(items.text, items.values),
      query<{ total: number }>(count.text, count.values),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return {
      items: rowsResult.rows.map(toOrganization),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    };
  },

  async findById(id: string): Promise<Organization | null> {
    const { rows } = await query<OrganizationRow>(
      `SELECT ${SELECT_COLUMNS} FROM organizations WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toOrganization(row) : null;
  },

  async create(input: { id: string; name: string }): Promise<Organization> {
    const { rows } = await query<OrganizationRow>(
      `INSERT INTO organizations (id, name)
       VALUES ($1, $2)
       RETURNING ${SELECT_COLUMNS}`,
      [input.id, input.name],
    );
    const row = rows[0];
    if (!row) throw new Error("INSERT returned no row");
    return toOrganization(row);
  },

  /** Partial update - only the provided fields are written. */
  async update(id: string, fields: { name?: string }): Promise<Organization | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (fields.name !== undefined) {
      values.push(fields.name);
      sets.push(`name = $${values.length}`);
    }
    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await query<OrganizationRow>(
      `UPDATE organizations SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${values.length}
       RETURNING ${SELECT_COLUMNS}`,
      values,
    );
    const row = rows[0];
    return row ? toOrganization(row) : null;
  },

  /** Hard delete - FKs to institutes/llm-configs cascade. */
  async remove(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM organizations WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },
};
