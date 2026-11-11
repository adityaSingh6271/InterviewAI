import { query } from "../config/db";
import type {
  Interview,
  InterviewStatus,
  ListParams,
  Paginated,
} from "../types/entities.types";
import { buildCountQuery, buildListQuery } from "../utils/query.util";

/**
 * Interviews repository (PDF 3: raw SQL only, explicit columns, `$n`
 * placeholders). Scoped reads join nothing - `institute_id` lives on the row;
 * child entities (rounds/applications) resolve scope through this table.
 *
 * Round aggregates are computed with correlated subqueries inside the same
 * statement (Standards PDF 18: no N+1 - the list stays one round-trip).
 * A round counts as completed once it has a submitted (or evaluated) attempt.
 */

const ROUND_STATS = `, (SELECT count(*)::int FROM rounds r WHERE r.interview_id = interviews.id) AS total_rounds,
  (SELECT count(*)::int FROM rounds r WHERE r.interview_id = interviews.id
     AND EXISTS (SELECT 1 FROM round_attempts ra WHERE ra.round_id = r.id AND ra.status <> 'IN_PROGRESS')) AS completed_rounds`;

const SELECT_COLUMNS = `id, institute_id, title, description, job_requirements, status,
  target_role, company, category, industry, experience_level,
  session_duration_minutes, eligibility_status, overall_progress,
  resume, extracted_job_data, match_analysis, created_by, created_at, updated_at`;

const SORT_COLUMNS: Record<string, string> = {
  createdAt: "created_at",
  title: "title",
  status: "status",
};

type InterviewRow = {
  id: string;
  institute_id: string;
  title: string;
  description: string | null;
  job_requirements: string | null;
  status: InterviewStatus;
  target_role: string | null;
  company: string | null;
  category: string | null;
  industry: string | null;
  experience_level: string | null;
  session_duration_minutes: number | null;
  eligibility_status: string | null;
  overall_progress: number;
  resume: Record<string, unknown> | null;
  extracted_job_data: Record<string, unknown> | null;
  match_analysis: Record<string, unknown> | null;
  created_by: string | null;
  total_rounds: number;
  completed_rounds: number;
  created_at: Date;
  updated_at: Date;
};

function toInterview(row: InterviewRow): Interview {
  return {
    id: row.id,
    instituteId: row.institute_id,
    title: row.title,
    description: row.description,
    jobRequirements: row.job_requirements,
    status: row.status,
    targetRole: row.target_role,
    company: row.company,
    category: row.category,
    industry: row.industry,
    experienceLevel: row.experience_level,
    sessionDurationMinutes: row.session_duration_minutes,
    eligibilityStatus: row.eligibility_status,
    overallProgress: row.overall_progress,
    resume: row.resume,
    extractedJobData: row.extracted_job_data,
    matchAnalysis: row.match_analysis,
    createdBy: row.created_by,
    totalRounds: row.total_rounds,
    completedRounds: row.completed_rounds,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Writable interview fields shared by create and update. */
export type InterviewWritable = {
  title?: string;
  description?: string | null;
  jobRequirements?: string | null;
  status?: InterviewStatus;
  targetRole?: string | null;
  company?: string | null;
  category?: string | null;
  industry?: string | null;
  experienceLevel?: string | null;
  sessionDurationMinutes?: number | null;
  eligibilityStatus?: string | null;
  overallProgress?: number;
  resume?: Record<string, unknown> | null;
  extractedJobData?: Record<string, unknown> | null;
  matchAnalysis?: Record<string, unknown> | null;
};

export type InterviewScope = {
  interview: Interview;
  /** Tenant scope for authorization checks. */
  instituteId: string;
};

export const interviewRepository = {
  /**
   * Paginated list.
   * @param scope.instituteId - restrict to one institute (null = all, super admin)
   * @param scope.studentViewerId - students see published rows plus the drafts
   *   they themselves created (other people's DRAFTs stay invisible)
   * @param scope.status - optional exact status filter
   */
  async list(
    params: ListParams,
    scope: {
      instituteId: string | null;
      studentViewerId?: string;
      status?: InterviewStatus;
    },
  ): Promise<Paginated<Interview>> {
    const clauses = [
      scope.instituteId ? { sql: `institute_id = ?`, value: scope.instituteId } : null,
      scope.status ? { sql: `status = ?`, value: scope.status } : null,
      // A student never sees someone else's unpublished (DRAFT) interview.
      // Parens required: OR binds looser than AND.
      scope.studentViewerId
        ? {
            sql: `(status <> 'DRAFT' OR created_by = ?)`,
            value: scope.studentViewerId,
          }
        : null,
      params.q
        ? {
            // Parens required: AND binds tighter than OR.
            sql: `(title ILIKE ? OR description ILIKE ?)`,
            value: `%${params.q}%`,
          }
        : null,
    ];
    const items = buildListQuery({
      select: `${SELECT_COLUMNS}${ROUND_STATS}`,
      from: `interviews`,
      clauses,
      params,
      sortColumns: SORT_COLUMNS,
      idColumn: `id`,
    });
    const count = buildCountQuery(`interviews`, clauses);

    const [rowsResult, countResult] = await Promise.all([
      query<InterviewRow>(items.text, items.values),
      query<{ total: number }>(count.text, count.values),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return {
      items: rowsResult.rows.map(toInterview),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    };
  },

  async findById(id: string): Promise<Interview | null> {
    const { rows } = await query<InterviewRow>(
      `SELECT ${SELECT_COLUMNS}${ROUND_STATS} FROM interviews WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toInterview(row) : null;
  },

  /** Read that also exposes the tenant scope for authorization. */
  async findByIdWithScope(id: string): Promise<InterviewScope | null> {
    const interview = await this.findById(id);
    return interview ? { interview, instituteId: interview.instituteId } : null;
  },

  async create(
    input: InterviewWritable & {
      id: string;
      instituteId: string;
      status: InterviewStatus;
      createdBy?: string | null;
    },
  ): Promise<Interview> {
    const { rows } = await query<InterviewRow>(
      `INSERT INTO interviews (id, institute_id, title, description, job_requirements, status,
         target_role, company, category, industry, experience_level,
         session_duration_minutes, eligibility_status, overall_progress,
         resume, extracted_job_data, match_analysis, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING ${SELECT_COLUMNS}, 0 AS total_rounds, 0 AS completed_rounds`,
      [
        input.id,
        input.instituteId,
        input.title ?? null,
        input.description ?? null,
        input.jobRequirements ?? null,
        input.status,
        input.targetRole ?? null,
        input.company ?? null,
        input.category ?? null,
        input.industry ?? null,
        input.experienceLevel ?? null,
        input.sessionDurationMinutes ?? null,
        input.eligibilityStatus ?? null,
        input.overallProgress ?? 0,
        input.resume ?? null,
        input.extractedJobData ?? null,
        input.matchAnalysis ?? null,
        input.createdBy ?? null,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("INSERT returned no row");
    return toInterview(row);
  },

  async update(id: string, fields: InterviewWritable): Promise<Interview | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown): void => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };
    if (fields.title !== undefined) set(`title`, fields.title);
    if (fields.description !== undefined) set(`description`, fields.description);
    if (fields.jobRequirements !== undefined) set(`job_requirements`, fields.jobRequirements);
    if (fields.status !== undefined) set(`status`, fields.status);
    if (fields.targetRole !== undefined) set(`target_role`, fields.targetRole);
    if (fields.company !== undefined) set(`company`, fields.company);
    if (fields.category !== undefined) set(`category`, fields.category);
    if (fields.industry !== undefined) set(`industry`, fields.industry);
    if (fields.experienceLevel !== undefined) set(`experience_level`, fields.experienceLevel);
    if (fields.sessionDurationMinutes !== undefined) {
      set(`session_duration_minutes`, fields.sessionDurationMinutes);
    }
    if (fields.eligibilityStatus !== undefined) set(`eligibility_status`, fields.eligibilityStatus);
    if (fields.overallProgress !== undefined) set(`overall_progress`, fields.overallProgress);
    if (fields.resume !== undefined) set(`resume`, fields.resume);
    if (fields.extractedJobData !== undefined) set(`extracted_job_data`, fields.extractedJobData);
    if (fields.matchAnalysis !== undefined) set(`match_analysis`, fields.matchAnalysis);
    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const { rowCount } = await query(
      `UPDATE interviews SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${values.length}`,
      values,
    );
    if ((rowCount ?? 0) === 0) return null;
    // Re-read so the round aggregates are real, not the zeroed placeholders
    // a bare RETURNING would have to invent.
    return this.findById(id);
  },

  async remove(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM interviews WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },
};
