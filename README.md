# InterviewAI

AI mock-interview platform, split into two independent apps:

| Folder | Stack | Package manager | Port |
| --- | --- | --- | --- |
| [`client/`](./client) | Next.js 16 + React 19 + Tailwind 4 | npm | 3000 |
| [`server/`](./server) | Express 5 + TypeScript | pnpm | 4000 |

There is no shared workspace: each folder owns its `package.json` and lockfile.

## Standards

**All frontend and backend work in this repository must follow
[`Standards.md`](./Standards.md)** (extracted from [`Standards.pdf`](./Standards.pdf),
the source of record — if the two ever disagree, the PDF wins).

The standards cover both halves of the app: frontend rules (reusable components,
Zod validation, TanStack Query/Table, states, accessibility, i18n) and backend
rules (layered architecture, raw SQL in repositories, validation, auth,
error handling, security, logging). AI agents working in this repo should read
`Standards.md` before writing code.

## Run it

Root [`package.json`](./package.json) is only a runner (not a workspace) — install the
two apps once (below), then start both from the repo root:

```bash
npm install        # root: installs concurrently only
npm run dev        # client on 3000 + server on 4000, prefixed output
```

Or run them separately:

Terminal 1 — frontend:

```bash
cd client
npm install
npm run dev
```

Terminal 2 — backend:

```bash
cd server
pnpm install
copy .env.example .env   # DATABASE_URL + JWT secrets required (fail-fast at boot)
pnpm db:migrate          # apply prisma/migrations/*.sql (prisma migrate deploy)
pnpm db:seed             # dev accounts: admin@example.com / student@example.com (see server/README.md)
pnpm dev
```

Then open the app at <http://localhost:3000> and the API at <http://localhost:4000/api/v1/health>.

## Server layout

Layered per the standards — `routes → controllers → services → repositories`,
with raw SQL living **only** in repositories:

```
server/
├── src/
│   ├── server.ts       # entry: env validation, DB ping, listen, graceful shutdown
│   ├── app.ts          # middleware assembly: helmet → cors → body → request-id →
│   │                   # rate limit → routes → 404 → central error handler
│   ├── config/         # env (Joi, fail-fast) · db (pg Pool) · logger (Winston JSON)
│   ├── constants/      # error codes · auth policy (TTLs, lockout, cookies)
│   ├── validations/    # Joi schemas per feature
│   ├── middleware/     # request-id · rate limits · origin · validation · auth · 404 · errors
│   ├── routes/         # URL paths → controllers (mounted under /api/v1)
│   ├── controllers/    # HTTP only: parse → service → response envelope
│   ├── services/       # domain logic, framework-agnostic, throws AppError
│   ├── repositories/   # the only place SQL lives (parameterized, snake_case)
│   ├── types/          # domain types + Express augmentation
│   └── utils/          # response envelope · AppError + PG code map · auth · cookies
└── prisma/            # schema.prisma (table source of truth) + migrations/*.sql (pnpm db:migrate)
```

See [`server/README.md`](./server/README.md) for scripts, endpoints, and conventions.

## Docs

Frontend design standards, the API integration roadmap, and agent/skill rules live with the app under [`client/`](./client).
