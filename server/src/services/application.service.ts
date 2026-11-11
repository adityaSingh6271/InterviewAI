import { randomUUID } from "node:crypto";
import { applicationRepository } from "../repositories/application.repository";
import { interviewRepository } from "../repositories/interview.repository";
import { studentRepository } from "../repositories/student.repository";
import type { AuthUser } from "../types/auth.types";
import type {
  ApplicationStatus,
  ListParams,
  Paginated,
  StudentApplication,
} from "../types/entities.types";
import { AppError } from "../utils/app-error.util";
import { requireAdmin, requireInstituteAccess, requireOwnerOrInstitute } from "../utils/scope.util";

/**
 * Student application service (PDF 13).
 *
 * - create: student-only, must target an ACTIVE interview of their own
 *   institute; duplicate applications hit the UNIQUE (interview, student)
 *   constraint and surface as 409;
 * - status changes: admin-only (the interview pipeline);
 * - read/delete: the owning student or an admin of the student's institute.
 */

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: unknown }).code === "23505";
}

async function loadScoped(
  actor: AuthUser,
  id: string,
): Promise<{ application: StudentApplication; instituteId: string; studentId: string }> {
  const scope = await applicationRepository.findByIdWithScope(id);
  if (!scope) throw AppError.notFound("Application not found");
  // Students see only their own applications; admins need the institute.
  requireOwnerOrInstitute(actor, scope.studentId, scope.instituteId);
  return {
    application: scope.application,
    instituteId: scope.instituteId,
    studentId: scope.studentId,
  };
}

export const applicationService = {
  async create(
    actor: AuthUser,
    input: {
      interviewId: string;
      resumeFileUrl?: string;
      resumeText?: string;
    },
  ): Promise<StudentApplication> {
    if (actor.portal !== "student") {
      throw AppError.forbidden("Only students can apply to interviews");
    }
    const interview = await applicationRepository.findInterviewForApplication(
      input.interviewId,
    );
    // Outside my institute -> indistinguishable from missing (404).
    if (!interview || interview.instituteId !== actor.instituteId) {
      throw AppError.notFound("Interview not found");
    }
    if (interview.status !== "ACTIVE") {
      throw AppError.conflict("Interview is not open for applications");
    }
    try {
      return await applicationRepository.create({
        id: randomUUID(),
        interviewId: input.interviewId,
        studentId: actor.id,
        resumeFileUrl: input.resumeFileUrl ?? null,
        resumeText: input.resumeText ?? null,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw AppError.conflict("You already applied to this interview");
      throw error;
    }
  },

  /**
   * List with scope. Admins may filter by interview or student (both
   * tenant-checked with 404 before the query); students can only ever list
   * their own applications.
   */
  async list(
    actor: AuthUser,
    params: ListParams,
    query: { interviewId?: string; studentId?: string; status?: ApplicationStatus },
  ): Promise<Paginated<StudentApplication>> {
    if (actor.portal === "student") {
      if (query.studentId !== undefined && query.studentId !== actor.id) {
        throw AppError.notFound("Student not found");
      }
      if (query.interviewId !== undefined) {
        const interview = await interviewRepository.findById(query.interviewId);
        if (!interview || interview.instituteId !== actor.instituteId) {
          throw AppError.notFound("Interview not found");
        }
      }
      return applicationRepository.list(params, {
        interviewId: query.interviewId,
        studentId: actor.id,
        instituteId: null,
        status: query.status,
      });
    }

    requireAdmin(actor);
    let instituteId: string | null = actor.adminRole === "SUPER_ADMIN" ? null : actor.instituteId;
    if (query.interviewId !== undefined) {
      const interview = await interviewRepository.findById(query.interviewId);
      if (!interview) throw AppError.notFound("Interview not found");
      requireInstituteAccess(actor, interview.instituteId);
      instituteId = null; // interview filter already pins the tenant
    }
    if (query.studentId !== undefined) {
      const student = await studentRepository.findById(query.studentId);
      if (!student) throw AppError.notFound("Student not found");
      requireInstituteAccess(actor, student.instituteId);
    }
    return applicationRepository.list(params, {
      interviewId: query.interviewId,
      studentId: query.studentId,
      instituteId,
      status: query.status,
    });
  },

  /** Nested list: `/interviews/:interviewId/applications` (admin pipeline). */
  async listByInterview(
    actor: AuthUser,
    interviewId: string,
    params: ListParams,
    query: { status?: ApplicationStatus },
  ): Promise<Paginated<StudentApplication>> {
    requireAdmin(actor);
    const interview = await interviewRepository.findById(interviewId);
    if (!interview) throw AppError.notFound("Interview not found");
    requireInstituteAccess(actor, interview.instituteId);
    return applicationRepository.list(params, {
      interviewId,
      instituteId: null,
      status: query.status,
    });
  },

  /** Nested list: `/students/:studentId/applications` (self or admin). */
  async listByStudent(
    actor: AuthUser,
    studentId: string,
    params: ListParams,
    query: { status?: ApplicationStatus },
  ): Promise<Paginated<StudentApplication>> {
    if (actor.portal === "student") {
      if (studentId !== actor.id) throw AppError.notFound("Student not found");
      return applicationRepository.list(params, {
        studentId: actor.id,
        instituteId: null,
        status: query.status,
      });
    }
    requireAdmin(actor);
    const student = await studentRepository.findById(studentId);
    if (!student) throw AppError.notFound("Student not found");
    requireInstituteAccess(actor, student.instituteId);
    return applicationRepository.list(params, {
      studentId,
      instituteId: null,
      status: query.status,
    });
  },

  async getById(actor: AuthUser, id: string): Promise<StudentApplication> {
    const { application } = await loadScoped(actor, id);
    return application;
  },

  /** Pipeline status change (admin). */
  async updateStatus(
    actor: AuthUser,
    id: string,
    input: { status: ApplicationStatus },
  ): Promise<StudentApplication> {
    requireAdmin(actor);
    await loadScoped(actor, id);
    const updated = await applicationRepository.updateStatus(id, input.status);
    if (!updated) throw AppError.notFound("Application not found");
    return updated;
  },

  /** Withdraw (student) or remove (admin). */
  async remove(actor: AuthUser, id: string): Promise<void> {
    await loadScoped(actor, id);
    await applicationRepository.remove(id);
  },
};
