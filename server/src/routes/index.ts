import { Router } from "express";
import { adminAccountRouter } from "./admin-account.routes";
import { adminRouter } from "./admin.routes";
import { applicationRouter } from "./application.routes";
import { attemptRouter } from "./attempt.routes";
import { authRouter } from "./auth.routes";
import { healthRouter } from "./health.routes";
import { instituteRouter } from "./institute.routes";
import { interviewRouter } from "./interview.routes";
import { organizationRouter } from "./organization.routes";
import { questionRouter } from "./question.routes";
import { responseRouter } from "./response.routes";
import { resumeRouter } from "./resume.routes";
import { roundRouter } from "./round.routes";
import { studentRouter } from "./student.routes";

/**
 * Everything mounted here is served under `/api/v1` (PDF 8: versioned,
 * plural, lowercase resource paths). Each feature owns its routes ->
 * controller chain; every router applies its own `protect`/`authorize`
 * guards (deny by default) plus Joi validation before reaching a handler.
 *
 * Resource mounts:
 *   /health              liveness probe (public)
 *   /auth                register/login/refresh/logout
 *   /admin               admin-portal dashboard stats
 *   /organizations       SUPER_ADMIN org CRUD (+ nested /:orgId/llm-configs)
 *   /institutes          admin institute CRUD (role-scoped)
 *   /admins              admin account CRUD (role-ranked)
 *   /students            student accounts (+ nested applications/attempts)
 *   /interviews          interview CRUD (+ nested rounds/applications)
 *   /resumes             resume upload -> extracted text (nothing stored)
 *   /rounds              round CRUD (+ nested questions/attempts)
 *   /questions           question read/update/delete
 *   /student-applications student applications (create/list/withdraw)
 *   /round-attempts      attempt start/submit (+ nested responses)
 *   /responses           response read/score/delete
 */
export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/organizations", organizationRouter);
apiRouter.use("/institutes", instituteRouter);
apiRouter.use("/admins", adminAccountRouter);
apiRouter.use("/students", studentRouter);
apiRouter.use("/interviews", interviewRouter);
apiRouter.use("/resumes", resumeRouter);
apiRouter.use("/rounds", roundRouter);
apiRouter.use("/questions", questionRouter);
apiRouter.use("/student-applications", applicationRouter);
apiRouter.use("/round-attempts", attemptRouter);
apiRouter.use("/responses", responseRouter);
