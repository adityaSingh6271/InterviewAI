import type { ListParams } from "../types/entities.types";

/**
 * Small SQL builder for the repository layer (Standards PDF 3: "dynamic
 * filters built via a small query builder that appends $n placeholders
 * safely"; PDF 27: sort fields allowlisted).
 *
 * Every filter is a `{ sql, value }` pair whose `sql` uses `?` as the
 * placeholder. `compile` replaces each `?` with the next `$n` and collects
 * the bound values in order - user input never reaches the template, only
 * the caller's static SQL fragments do.
 */

/**
 * A filter. `value` binds every `?` in `sql` to the same `$n`; omit `value`
 * entirely for static predicates (e.g. `status <> 'DRAFT'`) that bind nothing.
 */
export type WhereClause = { sql: string; value?: unknown };

/** A clause that may be absent (e.g. `q` search is optional). */
export type MaybeClause = WhereClause | null | undefined | false;

function compile(clauses: readonly MaybeClause[]): {
  where: string;
  values: unknown[];
} {
  const values: unknown[] = [];
  const parts: string[] = [];
  for (const clause of clauses) {
    if (!clause) continue;
    if (clause.value === undefined) {
      parts.push(clause.sql); // static predicate - binds nothing
      continue;
    }
    values.push(clause.value);
    const placeholder = `$${values.length}`;
    parts.push(clause.sql.split("?").join(placeholder));
  }
  return { where: parts.length > 0 ? ` WHERE ${parts.join(" AND ")}` : "", values };
}

export type ListQueryOptions = {
  /** Explicit column list - never `SELECT *` (Standards PDF 4). */
  select: string;
  /** Table or join source, e.g. `rounds r JOIN interviews i ON ...`. */
  from: string;
  clauses: readonly MaybeClause[];
  params: ListParams;
  /** Allowlist: camelCase sort key -> snake_case column (Standards PDF 27). */
  sortColumns: Readonly<Record<string, string>>;
  /** Qualified primary key for the deterministic ORDER BY tiebreaker. */
  idColumn: string;
};

/**
 * Items query: WHERE + deterministic ORDER BY + LIMIT/OFFSET.
 * The `id` tiebreaker keeps pagination stable across equal sort keys.
 */
export function buildListQuery(options: ListQueryOptions): {
  text: string;
  values: unknown[];
} {
  const { where, values } = compile(options.clauses);
  const column = options.sortColumns[options.params.sort] ?? "created_at";
  const direction = options.params.order === "asc" ? "ASC" : "DESC";
  values.push(options.params.limit, (options.params.page - 1) * options.params.limit);
  const limitAt = values.length - 1;
  const offsetAt = values.length;
  return {
    text:
      `SELECT ${options.select} FROM ${options.from}${where}` +
      ` ORDER BY ${column} ${direction}, ${options.idColumn} ${direction}` +
      ` LIMIT $${limitAt} OFFSET $${offsetAt}`,
    values,
  };
}

/**
 * Matching COUNT query. Reuses the same clause values as `buildListQuery`
 * (minus LIMIT/OFFSET), so the `$n` positions line up.
 */
export function buildCountQuery(
  from: string,
  clauses: readonly MaybeClause[],
): { text: string; values: unknown[] } {
  const { where, values } = compile(clauses);
  return { text: `SELECT count(*)::int AS total FROM ${from}${where}`, values };
}
