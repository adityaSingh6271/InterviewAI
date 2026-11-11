/**
 * Pagination, filtering, and sorting helpers (PDF 27).
 *
 * Hard rules encoded here:
 * - `limit` is clamped to <= 100 (PDF 9: validate `limit <= 100`);
 * - sort columns only ever come from a developer-supplied allowlist - user
 *   input is never interpolated into SQL (PDF 9 + 27: allowlist before SQL);
 * - ORDER BY direction is restricted to ASC/DESC.
 */

export type Pagination = {
  page: number;
  limit: number;
  offset: number;
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Parse `page`/`limit` query params into a safe offset/limit pair. */
export function parsePagination(query: {
  page?: unknown;
  limit?: unknown;
}): Pagination {
  const page = toPositiveInt(query.page, 1);
  const limit = Math.min(
    toPositiveInt(query.limit, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  return { page, limit, offset: (page - 1) * limit };
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "string"
      ? Number.parseInt(value, 10)
      : typeof value === "number"
        ? value
        : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : fallback;
}

/**
 * Build a safe `ORDER BY` clause.
 *
 * @param sort - requested column name from the client
 * @param order - requested direction ("asc"/"desc")
 * @param allowlist - columns this endpoint may sort by (developer constants)
 * @param fallback - column used when the request is out of policy
 * @returns e.g. `created_at DESC`
 */
export function buildOrderBy(
  sort: unknown,
  order: unknown,
  allowlist: readonly string[],
  fallback: string,
): string {
  const column =
    typeof sort === "string" && allowlist.includes(sort) ? sort : fallback;
  const direction =
    typeof order === "string" && order.toUpperCase() === "ASC" ? "ASC" : "DESC";
  return `${column} ${direction}`;
}
