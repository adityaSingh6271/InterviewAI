import { query } from "../config/db";
import type {
  ApplicationStatus,
  InterviewStatus,
  ListParams,
  Paginated,
  StudentApplication,
} from "../types/entities.types";
import { buildCountQuery, buildListQuery } from "../utils/query.util";

/**
 * Student applications repository (PDF 3: raw SQL only, explicit columns,
 * `$n` placeholders). Scoped reads join `interviews`/`students` to resolve
 * tenant scope for authorization without a second round-trip.
 */

const SELECT_COLUMNS = `a.id, a.interview_id, a.student_id, a.resume_file_url, a.resume_text, a.status, a.applied_at, a.updated_at`;

const SORT_COLUMNS: Record<string, string> = {
  appliedAt: "a.applied_at",
  status: "a.status",
  createdAt: "a.created_at",
};

type ApplicationRow = {
  id: string;
  interview_id: string;
  student_id: string;
  resume_file_url: string | null;
  resume_text: string | null;
  status: ApplicationStatus;
  applied_at: Date;
  updated_at: Date;
};

function toApplication(row: ApplicationRow): StudentApplication {
  return {
    id: row.id,
    interviewId: row.interview_id,
    studentId: row.student_id,
    resumeFileUrl: row.resume_file_url,
    resumeText: row.resume_text,
    status: row.status,
    appliedAt: row.applied_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Authorization context resolved by the scoped joins. */
export type ApplicationScope = {
  application: StudentApplication;
  /** Tenant of the interview the application belongs to. */
  instituteId: string;
  /** Tenant of the applicant (must match the interview's for valid rows). */
  studentInstituteId: string;
  studentId: string;
  interviewStatus: InterviewStatus;
};

type ScopedRow = ApplicationRow & {
  scope_institute_id: string;
  student_institute_id: string;
  interview_status: InterviewStatus;
};

function toScope(row: ScopedRow): ApplicationScope {
  return {
    application: toApplication(row),
    instituteId: row.scope_institute_id,
    studentInstituteId: row.student_institute_id,
    studentId: row.student_id,
    interviewStatus: row.interview_status,
  };
}

const SCOPE_FROM = `student_applications a
  JOIN interviews i ON i.id = a.interview_id
  JOIN students s ON s.id = a.student_id`;

const SCOPE_COLUMNS = `, i.institute_id AS scope_institute_id, s.institute_id AS student_institute_id, i.status AS interview_status`;

export const applicationRepository = {
  /**
   * Paginated applications.
   * @param scope.interviewId - one interview (admin pipeline view)
   * @param scope.studentId - one student's applications (self or admin)
   * @param scope.instituteId - institute restriction (null = unrestricted)
   */
  async list(
    params: ListParams,
    scope: {
      interviewId?: string;
      studentId?: string;
      instituteId: string | null;
      status?: ApplicationStatus;
    },
  ): Promise<Paginated<StudentApplication>> {
    const clauses = [
      scope.interviewId ? { sql: `a.interview_id = ?`, value: scope.interviewId } : null,
      scope.studentId ? { sql: `a.student_id = ?`, value: scope.studentId } : null,
      scope.instituteId ? { sql: `i.institute_id = ?`, value: scope.instituteId } : null,
      scope.status ? { sql: `a.status = ?`, value: scope.status } : null,
      params.q ? { sql: `(a.resume_text ILIKE ?)`, value: `%${params.q}%` } : null,
    ];
    const items = buildListQuery({
      select: SELECT_COLUMNS,
      from: SCOPE_FROM,
      clauses,
      params,
      sortColumns: SORT_COLUMNS,
      idColumn: `a.id`,
    });
    const count = buildCountQuery(SCOPE_FROM, clauses);

    const [rowsResult, countResult] = await Promise.all([
      query<ApplicationRow>(items.text, items.values),
      query<{ total: number }>(count.text, count.values),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return {
      items: rowsResult.rows.map(toApplication),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    };
  },

  /** Scoped read - exposes interview + student tenants for authorization. */
  async findByIdWithScope(id: string): Promise<ApplicationScope | null> {
    const { rows } = await query<ScopedRow>(
      `SELECT ${SELECT_COLUMNS}${SCOPE_COLUMNS} FROM ${SCOPE_FROM} WHERE a.id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toScope(row) : null;
  },

  async create(input: {
    id: string;
    interviewId: string;
    studentId: string;
    resumeFileUrl?: string | null;
    resumeText?: string | null;
  }): Promise<StudentApplication> {
    const { rows } = await query<ApplicationRow>(
      `INSERT INTO student_applications
         (id, interview_id, student_id, resume_file_url, resume_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SELECT_COLUMNS.replace(/a\./g, "")}`,
      [
        input.id,
        input.interviewId,
        input.studentId,
        input.resumeFileUrl ?? null,
        input.resumeText ?? null,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("INSERT returned no row");
    return toApplication(row);
  },

  /** Pipeline status change (admin). */
  async updateStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<StudentApplication | null> {
    const { rows } = await query<ApplicationRow>(
      `UPDATE student_applications SET status = $2, updated_at = now()
       WHERE id = $1
       RETURNING ${SELECT_COLUMNS.replace(/a\./g, "")}`,
      [id, status],
    );
    const row = rows[0];
    return row ? toApplication(row) : null;
  },

  async remove(id: string): Promise<boolean> {
    const { rowCount } = await query(
      `DELETE FROM student_applications WHERE id = $1`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  },

  /** Resolve the institute + status of an interview (application pre-checks). */
  async findInterviewForApplication(interviewId: string): Promise<{
    instituteId: string;
    status: InterviewStatus;
  } | null> {
    const { rows } = await query<{ institute_id: string; status: InterviewStatus }>(
      `SELECT institute_id, status FROM interviews WHERE id = $1`,
      [interviewId],
    );
    const row = rows[0];
    return row ? { instituteId: row.institute_id, status: row.status } : null;
  },
};
