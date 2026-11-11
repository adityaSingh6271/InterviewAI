# InterviewAI API server

Express 5 + TypeScript + PostgreSQL. Installed with **pnpm** (the `client/` app
uses npm; the two are independent).

**All code in this folder must follow [`Standards.md`](../Standards.md)**
(backend sections 0-31; source of record: [`Standards.pdf`](../Standards.pdf)).

## Scripts

| Command | Does |
| --- | --- |
| `pnpm install` | installs dependencies from `pnpm-lock.yaml` |
| `pnpm dev` | `tsx watch src/server.ts` — restarts on save, no build step |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm build` | emits CommonJS to `dist/` |
| `pnpm start` | runs compiled `dist/server.js` |
| `pnpm db:migrate` | `prisma migrate deploy` — applies pending `prisma/migrations/*.sql` |
| `pnpm db:migrate:dev` | `prisma migrate dev` — creates/validates migrations (needs a shadow DB) |
| `pnpm db:seed` | idempotent dev seed (org → institute → admin + demo student); refuses `NODE_ENV=production` |
| `pnpm db:studio` | browse tables in Prisma Studio |

## Setup

```bash
pnpm install
copy .env.example .env    # DATABASE_URL + JWT secrets are required, no defaults
pnpm db:migrate           # applies prisma/migrations/*.sql (0_init also creates the citext extension)
pnpm db:seed              # dev accounts + invite code (see Credentials below)
pnpm dev
```

The server **fails fast** at boot if the environment is invalid (Standards §23).
A missing database does *not* stop the boot: `/health` stays 200 and
`/health/ready` reports 503 until PostgreSQL answers.

Default: <http://localhost:4000>.

### Credentials (dev seed)

Two portals, two tables — `students` self-register, `admins` are **seeded**
(there is no endpoint that creates an admin):

| Portal | Email | Password | Notes |
| --- | --- | --- | --- |
| admin | `admin@example.com` | `Admin123!` | role `INSTITUTE_ADMIN` |
| student | `student@example.com` | `Student123!` | institute `Dev Institute` |
| – | – | – | student invite code: **`DEV2026`** |

Override with `SEED_ADMIN_PASSWORD` / `SEED_STUDENT_PASSWORD` before seeding.

```bash
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/health/ready
curl http://localhost:4000/api/v1/nope            # JSON 404 envelope
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "content-type: application/json" \
  -d '{"portal":"student","name":"Ada","email":"me@example.com","password":"short","instituteCode":"DEV2026"}'   # 422 with field details
```

## Endpoints

Every auth body carries **`portal`** — it selects which table is used
(`students` or `admins`). Access/refresh JWTs carry a matching `portal` claim.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | – | `portal` must be `"student"`; 201 + refresh cookie; 422 unknown `instituteCode`; 409 duplicate email; `portal:"admin"` → 422 |
| `POST` | `/api/v1/auth/login` | – | `portal: "student" \| "admin"`; 200; generic 401 (wrong table looks identical); 423 after 5 failures |
| `POST` | `/api/v1/auth/refresh-token` | refresh cookie | portal from the refresh JWT; rotates both tokens; old cookie → 401 |
| `POST` | `/api/v1/auth/logout` | – | portal from the refresh JWT; revokes + clears cookie; always 200 |
| `GET` | `/api/v1/auth/me` | Bearer | current identity (portal from the access JWT), 401 without a token |
| `GET` | `/api/v1/admin/stats` | Bearer + `admin` portal | 401 no token, 403 student portal; institute-scoped dashboard counters: `totalAdmins` / `totalStudents` / `totalInstitutes` + `interviews` / `applications` / `attempts` by status |
| `GET` | `/api/v1/health` | – | liveness, no dependencies |
| `GET` | `/api/v1/health/ready` | – | readiness, pings PostgreSQL (503 when down) |

**Origin rule:** `CLIENT_ORIGIN` is a comma-separated allowlist. A request whose
`Origin` is not on it gets **403**; in `NODE_ENV=production` auth requests
*without* an Origin get **403 ORIGIN_REQUIRED** (dev allows missing Origin so
curl/tests work).

**Response envelope (Standards §8):**

```jsonc
{ "success": true,  "data": { "...": "..." } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "field": "email", "message": "..." }] } }
```

**Tokens:** access token (15 min) is returned in the JSON body and sent as
`Authorization: Bearer <token>`. Refresh token (7 days) lives **only** in an
httpOnly cookie scoped to `/api/v1/auth` — frontend `fetch` calls that hit the
refresh/logout endpoints need `credentials: "include"`.

### AI layer (`src/ai/`)

One OpenAI-compatible adapter (`client.ts`) serves every provider; the
endpoint/key/model come from the org's active `organization_llm_configs` row
(AES-256-GCM decrypted in memory only — never logged, never returned).

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/v1/interviews/:interviewId/generate-questions` | Bearer + `admin` | body `{count 1–20 (5), difficulty?, topics?, roundId?}`; **200 preview, nothing persisted**; 503 `AI_NOT_CONFIGURED` |
| `POST` | `/api/v1/rounds/:roundId/questions/batch` | Bearer + `admin` | commit a previewed batch: `{questions:[{prompt, expectedKeywords?, difficulty}]}`, 201, one atomic INSERT (max 20) |
| `POST` | `/api/v1/interviews/:interviewId/generate-description` | Bearer + `admin` | body `{focus?}`; 200 `{description, jobRequirements}` draft — save via `PATCH /interviews/:id` |
| `POST` | `/api/v1/responses/:responseId/evaluate` | Bearer + `admin` | writes `ai_score`/`ai_feedback`; 409 while the attempt is IN_PROGRESS; 503/502/504 on provider problems |
| `POST` | `/api/v1/round-attempts/:attemptId/evaluate` | Bearer + `admin` | re-evaluates every response (concurrency 3): `200 {evaluated, failed, responses}` — failures are counted, not fatal |
| `PATCH` | `/api/v1/round-attempts/:attemptId` | Bearer + student | first submit (`→ COMPLETED`) also runs **inline** evaluation; `meta: {evaluation: "evaluated"\|"partial"\|"skipped", failed, reason?}` — AI problems never fail the submit |

Guarantees: model output is validated like any client request (Joi, one
corrective retry, then **502 `AI_BAD_OUTPUT`**); upstream failures map to
`AI_UPSTREAM_ERROR` 502 / `AI_TIMEOUT` 504 (one retry on 429/5xx);
missing config is **503 `AI_NOT_CONFIGURED`**; `aiLimiter` caps AI routes at
15/min per IP. Generation is always preview-then-commit — the model never
writes to the database itself.

## Structure

```
src/
├── server.ts          # entry: env validation, DB ping, listen, graceful shutdown
├── app.ts             # middleware assembly (helmet → cors → body → id → limit → routes → 404 → errors)
├── config/            # env (Joi, fail-fast) · db (pg Pool, query, withTransaction) · logger (JSON)
├── constants/         # error codes · auth policy (TTLs, lockout, cookie settings)
├── validations/       # Joi schemas per feature
├── middleware/        # requestId · rate limits · origin · validation · auth · 404 · error handler
├── routes/            # URLs only → controllers   (index.ts mounts under /api/v1)
├── controllers/       # HTTP only: parse → service → envelope
├── services/          # domain logic, framework-agnostic, throws AppError
├── repositories/      # the ONLY place SQL lives (student · admin · institute · …)
├── ai/                # LLM layer: client (fetch adapter) · resolve (config+decrypt) · prompts · validators · ai.service
├── types/             # domain types (Portal/AuthUser) + Express augmentation
├── utils/             # response envelope · AppError + PG code map · auth (bcrypt/JWT) · cookies · pagination
prisma/
├── schema.prisma      # table source of truth (Prisma owns schema; runtime queries stay raw SQL)
├── seed.ts            # `pnpm db:seed` — idempotent dev accounts (org → institute → admin + student)
└── migrations/        # generated SQL, applied by `pnpm db:migrate` — never edit once applied
```

Rules of the house (Standards §1, §3, §12-14):

- **routes** know URLs, **controllers** know HTTP, **services** know the
  domain, **repositories** know SQL — SQL never appears outside a repository.
- **Schema changes** go through `prisma/schema.prisma` and a *new* migration
  folder under `prisma/migrations/` (`pnpm db:migrate:dev`; on a database
  without a shadow DB such as Neon, generate the SQL instead with
  `prisma migrate diff --from-url <DATABASE_URL> --to-schema-datamodel prisma/schema.prisma --script`),
  then `pnpm db:migrate`. Never hand-create/alter tables or edit an applied
  migration. Prisma manages **schema only** — runtime queries stay raw SQL
  (Prisma Client is installed but unused at runtime).
- Throw `AppError` (`utils/app-error.util.ts`) anywhere; `middleware/error-handler.ts`
  is the only place that writes error JSON. PG SQLSTATEs (23505→409, 23503→409,
  23502→400, 22P02→400) and JWT errors are mapped centrally.
- Validation failures are **422** with field details — schemas live in
  `validations/`, applied by `validate({ body, query, params })`.
- Error middleware keeps four parameters — Express detects it by `fn.length === 4`.
- Never `console.log`; use the Winston logger. Never log passwords, tokens, or
  SQL parameter values.
- Pagination/sorting helpers in `utils/db.util.ts` clamp `limit ≤ 100` and only
  allowlist sort columns (Standards §27).

## Adding a resource

For an `interviews` module, four files:

```ts
// src/routes/interviews.routes.ts
export const interviewsRouter = Router();
interviewsRouter.get("/", protect, validate({ query: listQuerySchema }), interviewsController.list);

// src/controllers/interviews.controller.ts
export const interviewsController = {
  list: asyncHandler(async (req, res) => sendSuccess(res, 200, await interviewsService.list(req.query))),
};

// src/services/interviews.service.ts
export const interviewsService = { list: async (query) => interviewRepository.findAll(...) };

// src/repositories/interview.repository.ts
export const interviewRepository = { findAll: async ({ limit, offset }) => (await query(`SELECT ... LIMIT $1 OFFSET $2`, [limit, offset])).rows.map(toDomain) };
```

then mount it in `src/routes/index.ts`:

```ts
apiRouter.use("/interviews", interviewsRouter);
```

## Known limitations

- **Graceful shutdown is code-review-verified only.** `server.ts` handles
  `SIGINT`, `SIGTERM`, and `SIGBREAK` (drain HTTP, close the pool, flush logs,
  10s force-exit), but the Windows harness this was built on hard-kills child
  processes instead of delivering signals, and console-signal injection proved
  unreliable. Verify shutdown manually on Linux or in the deployed environment.
