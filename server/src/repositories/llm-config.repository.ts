import { query } from "../config/db";
import type { ListParams, LlmConfig, Paginated } from "../types/entities.types";
import { buildCountQuery, buildListQuery } from "../utils/query.util";

/**
 * Organization LLM configs repository (PDF 3: raw SQL only, explicit
 * columns, `$n` placeholders).
 *
 * The API key column is never part of `SELECT_COLUMNS` - reads return the
 * public shape only. `api_key_encrypted` is written by `create`/`update`
 * (already encrypted by the service) and read solely by the future LLM
 * runtime through `findActiveKeyForOrganization`.
 */

const SELECT_COLUMNS = `id, organization_id, provider, model_name, settings, is_active, created_at, updated_at`;

const SORT_COLUMNS: Record<string, string> = {
  createdAt: "created_at",
  provider: "provider",
  modelName: "model_name",
};

type LlmConfigRow = {
  id: string;
  organization_id: string;
  provider: string;
  model_name: string;
  settings: Record<string, unknown> | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

function toLlmConfig(row: LlmConfigRow): LlmConfig {
  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider,
    modelName: row.model_name,
    settings: row.settings,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const llmConfigRepository = {
  /** Paginated configs of one organization (never includes the API key). */
  async list(
    organizationId: string,
    params: ListParams,
  ): Promise<Paginated<LlmConfig>> {
    const clauses = [
      { sql: `organization_id = ?`, value: organizationId },
      params.q
        ? {
            // Parens required: AND binds tighter than OR.
            sql: `(provider ILIKE ? OR model_name ILIKE ?)`,
            value: `%${params.q}%`,
          }
        : null,
    ];
    const items = buildListQuery({
      select: SELECT_COLUMNS,
      from: `organization_llm_configs`,
      clauses,
      params,
      sortColumns: SORT_COLUMNS,
      idColumn: `id`,
    });
    const count = buildCountQuery(`organization_llm_configs`, clauses);

    const [rowsResult, countResult] = await Promise.all([
      query<LlmConfigRow>(items.text, items.values),
      query<{ total: number }>(count.text, count.values),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return {
      items: rowsResult.rows.map(toLlmConfig),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    };
  },

  /** Scoped read: config must belong to `organizationId`. */
  async findById(organizationId: string, id: string): Promise<LlmConfig | null> {
    const { rows } = await query<LlmConfigRow>(
      `SELECT ${SELECT_COLUMNS} FROM organization_llm_configs
       WHERE id = $1 AND organization_id = $2`,
      [id, organizationId],
    );
    const row = rows[0];
    return row ? toLlmConfig(row) : null;
  },

  async create(input: {
    id: string;
    organizationId: string;
    provider: string;
    modelName: string;
    /** Plaintext key - the service encrypts before calling. */
    apiKeyEncrypted: string;
    settings: Record<string, unknown> | null;
    isActive: boolean;
  }): Promise<LlmConfig> {
    const { rows } = await query<LlmConfigRow>(
      `INSERT INTO organization_llm_configs
         (id, organization_id, provider, model_name, api_key_encrypted, settings, is_active)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING ${SELECT_COLUMNS}`,
      [
        input.id,
        input.organizationId,
        input.provider,
        input.modelName,
        input.apiKeyEncrypted,
        input.settings === null ? null : JSON.stringify(input.settings),
        input.isActive,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("INSERT returned no row");
    return toLlmConfig(row);
  },

  async update(
    organizationId: string,
    id: string,
    fields: {
      provider?: string;
      modelName?: string;
      apiKeyEncrypted?: string;
      settings?: Record<string, unknown> | null;
      isActive?: boolean;
    },
  ): Promise<LlmConfig | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown, cast = ""): void => {
      values.push(value);
      sets.push(`${column} = $${values.length}${cast}`);
    };
    if (fields.provider !== undefined) set(`provider`, fields.provider);
    if (fields.modelName !== undefined) set(`model_name`, fields.modelName);
    if (fields.apiKeyEncrypted !== undefined) set(`api_key_encrypted`, fields.apiKeyEncrypted);
    if (fields.settings !== undefined) {
      // JSONB cast on a text parameter (a plain string would store a JSON string).
      set(`settings`, fields.settings === null ? null : JSON.stringify(fields.settings), `::jsonb`);
    }
    if (fields.isActive !== undefined) set(`is_active`, fields.isActive);
    if (sets.length === 0) return this.findById(organizationId, id);

    values.push(id, organizationId);
    const { rows } = await query<LlmConfigRow>(
      `UPDATE organization_llm_configs SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${values.length - 1} AND organization_id = $${values.length}
       RETURNING ${SELECT_COLUMNS}`,
      values,
    );
    const row = rows[0];
    return row ? toLlmConfig(row) : null;
  },

  async remove(organizationId: string, id: string): Promise<boolean> {
    const { rowCount } = await query(
      `DELETE FROM organization_llm_configs WHERE id = $1 AND organization_id = $2`,
      [id, organizationId],
    );
    return (rowCount ?? 0) > 0;
  },

  /**
   * The one read that touches `api_key_encrypted` - for the LLM runtime only.
   * Returns the stored (encrypted) value, the generation settings, and the
   * active flag. The key must be decrypted by the caller (`resolve.ts`) and
   * never leaves the AI layer.
   */
  async findActiveKeyForOrganization(
    organizationId: string,
  ): Promise<{
    provider: string;
    modelName: string;
    apiKeyEncrypted: string;
    settings: Record<string, unknown> | null;
  } | null> {
    const { rows } = await query<{
      provider: string;
      model_name: string;
      api_key_encrypted: string;
      settings: Record<string, unknown> | null;
    }>(
      `SELECT provider, model_name, api_key_encrypted, settings
       FROM organization_llm_configs
       WHERE organization_id = $1 AND is_active = TRUE
       ORDER BY created_at DESC
       LIMIT 1`,
      [organizationId],
    );
    const row = rows[0];
    return row
      ? {
          provider: row.provider,
          modelName: row.model_name,
          apiKeyEncrypted: row.api_key_encrypted,
          settings: row.settings,
        }
      : null;
  },
};
