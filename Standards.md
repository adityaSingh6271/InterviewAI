# Engineering Standards

> Source of record: [`Standards.pdf`](./Standards.pdf) in the repo root.
> This Markdown copy is extracted from that PDF so AI agents and tooling can read
> it directly. **If the two ever disagree, the PDF wins** -- re-extract and update
> this file.

> **All frontend and backend work in this repository must follow these standards.**

---

# Frontend Standards

## 0. Global / Cross-Cutting Standards

- Components used in multiple locations are built as reusable components
- Component APIs and naming conventions are consistent
- Common reusable components exist for: inputs, buttons, dropdowns, modals, cards, tables, loaders, form controls, date pickers
- UI code is not duplicated when a reusable component can handle it
- Zod validation is used centrally, with clear messages and no duplicated validation logic
- TanStack Query is used for server-state management
- TanStack Table is used for complex/reusable data tables
- File/folder structure is clean, scalable, and feature-organized
- Business logic is separated from UI components
- Default, loading, empty, error, success, disabled, read-only states
- Responsive: mobile, tablet, desktop
- Accessibility: labels, ARIA, keyboard nav, focus states, contrast
- Permissions/roles: hide, disable, or read-only based on role
- i18n: no hardcoded strings, RTL support, date/number/currency formatting
- Validation, sanitization, safe error handling
- Confirmation for destructive actions; undo where possible
- URL/state sync where useful
- Performance: debounce, virtualization, lazy loading, memoization
- Dark/light theme support using design tokens
- Unit, integration, and E2E coverage; stable test IDs
- Analytics/events if required

## 1. Input Fields

- Minimum and maximum character limits are defined
- Character limits are displayed where required
- Input beyond the defined limit is prevented or handled
- Correct Shadcn/input types are used: text, number, email, password, date, URL, telephone
- Input types support proper browser-level validation and UX
- Zod schema-based validation is implemented
- Validation rules are defined centrally and consistently
- Validation messages are clear and user-friendly
- Validation logic is not duplicated across components
- Reusable input components are used for common fields
- Labels, placeholders, validation, error handling, and styling are configurable via props
- Label, help text, required indicator
- Error, success, disabled, read-only states
- Clear button, prefix/suffix/icons
- Password show/hide
- Autocomplete/autofill
- Copy/paste support
- Masking if needed
- Keyboard and screen-reader accessibility

## 2. Buttons

- Icons are used with text labels where they improve clarity
- Icon size, alignment, and spacing are consistent
- Icons without labels are avoided when the action may be unclear
- One consistent icon library is used
- Consistent border radius
- Consistent border
- Consistent padding
- Consistent font size
- Consistent font weight
- Consistent height
- Consistent icon spacing
- Hover state handled
- Active state handled
- Disabled state handled
- Focus state handled
- Multiple CSS variations for the same button type are avoided unless required by design
- Loader is displayed when an action requires processing time
- Button is disabled during ongoing requests where appropriate
- Duplicate submissions from repeated clicks are prevented
- Loader placement and styling are consistent across the app
- Variants: primary, secondary, ghost, danger
- Sizes and responsive behavior
- Destructive action confirmation
- Permission-aware behavior
- Keyboard/focus support

## 3. Text Areas

- Current character count is displayed where a limit applies
- Maximum allowed characters are clearly indicated
- Input beyond the defined limit is prevented or appropriately handled
- Maximum height is defined
- Text area does not expand indefinitely and affect page layout
- Scrolling is enabled when content exceeds maximum height
- Validation and error states
- Disabled/read-only states
- Accessible labeling and keyboard support

## 4. Multi-Select and Combo Box

### Multi-Select

- Standardized reusable multi-select component is used
- Selecting and removing multiple options is supported
- Clear selected-state indicators are provided
- Empty, loading, and disabled states are handled consistently

### Combo Box

- Reusable combo box component is used where searchable selection is required
- Search/filter functionality works correctly
- Single or multiple selection is supported as required
- Loading state handled
- Empty state handled
- Disabled state handled
- Clear selection where applicable
- Styling and behavior are consistent across the application

## 5. Data Tables

- Column alignment is consistent
- Header styling is consistent
- Row spacing is consistent
- Typography is consistent
- Action buttons are consistent
- Empty states are handled
- Loading states are handled
- Error states are handled
- Responsive behavior is handled
- Server-side pagination is implemented for large datasets
- Only required records for the current page are fetched
- Current page is provided
- Page size is provided
- Total records are provided
- Next/Previous navigation is provided
- Complete dataset is not loaded on the client when unnecessary
- TanStack Table is used for complex/reusable tables
- Standardized column definitions are used
- Sorting is supported where required
- Filtering is supported where required
- Server-side pagination is integrated
- Table configurations are reusable
- Table logic is kept separate from unrelated UI logic
- Total count / filtered count / selected count
- Add item option
- Actions button with edit/view/delete/duplicate
- Select and Select All: current page + all filtered
- Export selected/filtered/all
- Pagination with custom items per page, jump, first/last
- Filters: global search for non-categorical fields, dropdowns for categorical data, date range, saved filters, clear all
- Header sorting: single/multi-column, sort indicators
- Grid/list view toggle
- Column visibility, resize, reorder, pin
- Sticky header/footer, row density
- Expandable rows, nested tables
- Loading skeleton, empty state, error state, no-results state
- Mobile: horizontal scroll or card view
- URL state sync, selection persistence
- Keyboard navigation, bulk actions, permission-aware actions

## 6. Date Validation

- End date is not earlier than start date
- Appropriate minimum and maximum date restrictions are applied
- Clear validation messages are displayed for invalid date ranges
- Same validation logic is applied consistently across forms and filters
- Example: Start Date 10 Sep 2026 → End Date 15 Sep 2026 = valid
- Example: Start Date 15 Sep 2026 → End Date 10 Sep 2026 = invalid
- Timezone handling where needed
- Presets: today, last 7 days, this month, custom
- Manual input + picker support
- Locale and accessibility support

## 7. Forms

- Layout: sections, columns, labels, help text
- Validation: required, format, async, cross-field
- Error summary and inline errors
- Submit, cancel, reset
- Draft save/autosave
- Dirty state warning
- Loading/submitting/disabled states
- Success/error handling
- Permissions/read-only fields
- Conditional fields
- File upload integration
- Multi-step support if wizard
- Responsive and accessible

## 8. Navigation

### Sidebar / Nav

- Collapsible/expandable
- Active state
- Nested items
- Icons and badges
- Search
- Permissions
- Responsive drawer on mobile
- Keyboard navigation
- Persist collapsed state

### Tabs

- Active tab
- Add/close/reorder if applicable
- Lazy load content
- URL sync
- Disabled tabs
- Badge/count
- Keyboard arrow navigation
- Responsive overflow

### Breadcrumbs

- Hierarchy
- Current page not linked
- Truncation
- Home link
- Responsive
- ARIA/schema

### Pagination

- Page size selector
- First/prev/next/last
- Page numbers with ellipsis
- Total count/pages
- Jump to page
- URL sync
- Disabled states
- Responsive
- Accessibility

### Stepper / Wizard

- Steps: current, completed, error
- Next/back/skip
- Validation per step
- Save draft
- Summary/review
- Cancel/exit confirmation
- Responsive
- URL sync
- Permissions

### Menu / Dropdown Menu

- Trigger, items, dividers, groups
- Icons, shortcuts, badges
- Disabled items
- Submenus
- Keyboard navigation
- Click outside/escape
- Position collision handling
- Permissions

## 9. Feedback and Overlays

### Modal / Dialog

- Title, description, close
- Sizes
- Primary/secondary actions
- Focus trap, escape, click outside
- Scroll lock
- Loading/error states
- Unsaved changes confirmation
- Responsive full-screen mobile
- Accessibility

### Drawer / Side Panel

- Left/right/top/bottom
- Overlay/close
- Resizable if needed
- Scrollable content
- Sticky footer actions
- Focus trap
- Responsive
- URL state if useful

### Toast / Notification

- Types: success/error/warning/info
- Auto-dismiss and manual close
- Action link
- Stacking/position
- Persist critical errors
- Accessibility live region
- Avoid duplicates

### Alert / Banner

- Type, title, message
- Dismissible
- Action
- Icon
- Inline vs global
- Accessibility

### Confirmation Dialog

- Clear title
- Consequence text
- Confirm/cancel
- Destructive styling
- Type-to-confirm for critical actions
- Loading state
- Keyboard support

### Tooltip / Popover

- Trigger: hover/focus/click
- Position collision handling
- Delay
- Rich content in popover
- Dismiss on escape/click outside
- Accessibility
- Mobile fallback

### Loading / Skeleton

- Spinner, skeleton, progress
- Context-specific
- Avoid layout shift
- Timeout/error handling
- Accessibility
- Reduced motion support

### Empty State

- Illustration/icon
- Title/description
- Primary action
- Secondary help
- Contextual
- Permissions

### Error State

- User-friendly message
- Retry action
- Support/contact
- Error code
- Logging
- No sensitive data leak

## 10. Other Display Components

### Card / Card Grid

- Header, body, footer
- Image/media, title, description, metadata
- Primary/secondary actions, overflow menu
- Select checkbox, status badge
- Loading skeleton, empty/error state
- Responsive grid columns
- Hover/focus/active states
- Full-card click target vs action buttons
- Permissions

### Dashboard / Widgets

- KPI cards: value, label, trend, comparison, sparkline
- Date range filter
- Refresh, export, drill-down
- Loading/error/empty states
- Responsive layout
- Drag/resize if customizable
- Auto-refresh option
- Permissions

### Charts

- Title, legend, axes, labels, tooltips
- Data series and accessible colors
- Time range/filter
- Loading/empty/error states
- Export image/CSV
- Responsive
- Drill-down interaction
- Accessibility fallback table

### Calendar / Scheduler

- Month/week/day views
- Today, prev/next, date picker
- Add/edit/delete event
- Drag/drop reschedule
- Filters
- Timezone handling
- Conflict handling
- Loading/empty/error states
- Responsive, permissions

### Timeline / Activity Feed

- Chronological items
- Group by date
- Icons/status
- Load more/pagination
- Filters
- Empty/loading/error states
- Relative timestamps
- Click to detail

### Tree / Nested List

- Expand/collapse
- Single/multi select
- Search/filter
- Add/edit/delete nodes
- Drag/drop
- Cascading checkboxes
- Loading/empty/error states
- Keyboard navigation
- Virtualization for large trees

## 11. Reusable Components and File Structure

### Reusable Components

- Components used in multiple locations are reusable
- Consistent component API and naming convention
- Common reusable components include inputs, buttons, dropdowns, modals, cards, tables, loaders, form controls, date pickers
- UI code duplication is avoided when a reusable component can handle the same functionality

### File and Folder Structuring

- Project structure is clean and scalable
- Files are organized by features, components, utilities, hooks, services, and pages
- Related files are kept together where practical
- Consistent naming conventions for files and folders
- Unnecessarily large files and components are avoided
- Business logic is separated from UI components where appropriate
- Structure allows developers to easily locate and reuse existing functionality

## 12. TanStack Query

- Used for server-state management and API data handling
- Queries are used for fetching server data
- Mutations are used for create, update, and delete operations
- Loading states are implemented
- Error states are implemented
- Success handling is implemented
- Cache management is implemented
- Query invalidation is handled
- Refetching is handled
- Unnecessary API calls are avoided
- Duplicated server-state management is avoided

## 13. TanStack Table

- Used for complex and reusable data-table implementations
- Standardized column definitions are used
- Sorting is supported where required
- Filtering is supported where required
- Server-side pagination is integrated for large datasets
- Reusable table configurations are maintained
- Table-related logic is kept separate from unrelated UI logic where practical

## 14. Overall Quality Gate

- UI is consistent across screens
- Components are reusable
- Validation is consistent
- Loading and error states are handled
- Code is maintainable and scalable
- No unnecessary duplication exists
- All N/A items are explicitly justified
- The component passes accessibility, responsiveness, permission, and i18n checks
- The component is ready for review with test IDs and test coverage where applicable

# Backend Standards

## 0. Universal / Cross-Cutting Standards

- TypeScript strict mode enabled; no any unless justified
- Consistent naming: camelCase for variables/functions, PascalCase for classes, kebab-case for files, SCREAMING_SNAKE_CASE for env vars, snake_case for DB columns
- Layered architecture: routes → controllers → services → repositories (SQL layer)
- Business logic lives in services, not controllers or routes
- All SQL lives in repository/query layer — never in controllers or routes
- Parameterized queries only ($1, $2, ...). String interpolation into SQL is forbidden
- Shared utilities in /utils, shared types in /types, shared constants in /constants
- Environment-based config via .env + validated schema (Joi)
- Never commit secrets; .env.example maintained
- Graceful shutdown handling (SIGTERM, SIGINT) — drain pool and server
- Health check endpoint (/health, /ready) including DB ping
- Consistent API response envelope
- All async handlers wrapped to catch rejections
- No console.log in production; use a structured logger
- Unit, integration, and E2E coverage
- OpenAPI/Swagger docs kept in sync with routes

## 1. Project Structure

- Feature-based or layer-based folders, consistently applied
- No circular dependencies
- Barrel exports (index.ts) used consistently
- Path aliases configured (@/modules/...)
- Separation: app.ts (Express app) vs server.ts (listen + pool)
- No business logic or SQL in app.ts
- SQL files either inline in repository (tagged template) or as .sql files loaded by name

## 2. Database Connection (pg Pool)

- Single Pool instance exported as singleton (config/db.ts)
- Pool config: host, port, user, password, database, max, idleTimeoutMillis, connectionTimeoutMillis
- max sized for environment (dev small, prod sized to DB limits)
- SSL enabled in prod (ssl: { rejectUnauthorized: true })
- application_name set for observability
- statement_timeout set per connection or per query
- Pool error handler (pool.on('error', ...)) logs and does not crash process
- pool.end() on graceful shutdown
- Query wrapper logs slow queries and durations
- No client = new Client() per request — always use pool
- Read replicas used via separate pool if applicable
- Connection health verified at startup

## 3. Query Layer (Repository Pattern)

- Every query in a repository function, not inline in services/controllers
- Parameterized queries only: pool.query('SELECT ... WHERE id = $1', [id])
- No template-literal concatenation of user input
- Dynamic filters built via a small query builder that appends $n placeholders safely
- Return typed rows (QueryResult<Row> or mapped domain objects)
- Map snake_case DB columns to camelCase domain fields explicitly
- Repositories return domain objects, not raw pg rows, to services
- No N+1 queries; batch with WHERE id = ANY($1) or joins
- Reusable SQL fragments (select lists, where clauses) centralized
- Pagination via LIMIT $n OFFSET $m or keyset (WHERE id < $1 ORDER BY id DESC LIMIT $n)
- Total count query separate and optional (COUNT(*) OVER() or separate query)
- Repository functions unit-testable with a mocked pool or test DB

## 4. SQL Authoring Standards

- Uppercase SQL keywords (SELECT, FROM, WHERE) for readability
- Consistent indentation and aliasing (u for users, etc.)
- Always list columns explicitly — no SELECT * in application code
- Always specify ORDER BY for deterministic pagination
- Use RETURNING * or RETURNING id, ... on INSERT/UPDATE/DELETE
- Use ON CONFLICT ... DO UPDATE for upserts
- Use WHERE on every UPDATE/DELETE — no accidental full-table writes
- Use ILIKE with care (performance); prefer citext or normalized columns
- Avoid functions in WHERE on indexed columns unless functional index exists
- Use EXPLAIN ANALYZE for slow queries during review
- Long SQL extracted to .sql files for readability
- No SELECT ... FOR UPDATE without timeout/transaction plan
- Use CTEs for complex reads, not nested subqueries where readability suffers

## 5. Transactions

- Multi-step writes wrapped in a transaction
- Helper withTransaction(async (client) => { ... }) used consistently
- BEGIN, COMMIT, ROLLBACK handled with try/catch/finally
- Always release client back to pool (client.release() in finally)
- Isolation level chosen explicitly when needed (SET TRANSACTION ISOLATION LEVEL)
- Deadlock handling with retry (bounded)
- No long-running transactions; no external API calls inside a transaction
- Savepoints used for partial rollback if required
- Idempotency keys for critical POSTs
- Optimistic locking via version column where required

## 6. Migrations

- Migration tool chosen and used consistently (node-pg-migrate, dbmate, Flyway, or custom runner)
- Migrations are numbered, immutable once applied
- Each migration is idempotent-safe when re-run in dev where possible
- Every schema change has a forward migration
- Rollback (down) written for every migration where practical
- No destructive change (drop column/table) without backup + two-step deploy plan
- Migrations run in CI/CD before app start (migrate up)
- Never edit applied migrations — add a new one
- Migration files reviewed for lock impact on large tables
- Backfill migrations separated from schema migrations
- Seeds (seeds/) idempotent and only for dev/test
- Migration names descriptive (0007_add_index_users_email.sql)

> **Recorded project deviation (keep):** this project uses **Prisma v6 as the
> migration tool**. Table shapes live in `server/prisma/schema.prisma`;
> generated SQL lives in `server/prisma/migrations/NNNN_*/migration.sql` and is
> applied with `pnpm db:migrate` (`prisma migrate deploy`). Prisma is used
> **only for schema management** — all runtime queries remain hand-written
> parameterized SQL in repositories (§3/§4 unchanged; Prisma Client is never
> used at runtime). Consequences accepted: no per-migration down scripts (Prisma
> has no rollback command, so "rollback (down) written for every migration" is
> waived), and §7 schema rules are expressed as Prisma attributes
> (`@db.Uuid`, `@db.Timestamptz`, `@default(dbgenerated("gen_random_uuid()"))`,
> snake_case `@map`/`@@map`). Never reintroduce a hand-rolled migration runner
> or edit an applied migration — add a new one.

## 7. Schema Design (PostgreSQL)

- Primary keys: uuid (gen_random_uuid()) or bigserial per convention
- Timestamps: created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ
- updated_at maintained by trigger or app code consistently
- Soft delete: deleted_at TIMESTAMPTZ NULL where required
- NOT NULL enforced by default; nullable only with reason
- CHECK constraints for invariants (e.g. end_date >= start_date)
- Foreign keys with explicit ON DELETE / ON UPDATE
- Unique constraints for natural keys (UNIQUE (email))
- Partial unique indexes for soft-deleted rows (WHERE deleted_at IS NULL)
- Enums via CREATE TYPE or CHECK constraints (pick one consistently)
- citext for case-insensitive columns like email
- jsonb for flexible fields; validated at app layer
- Indexes on foreign keys and hot filter/sort columns
- Composite indexes ordered by selectivity
- Partial and covering indexes where beneficial
- No SELECT *-driven schema drift; columns documented

## 8. API Design & Routing

- RESTful resource naming: plural nouns, lowercase, hyphens
- Consistent versioning: /api/v1/...
- Correct HTTP methods: GET, POST, PUT/PATCH, DELETE
- Correct status codes:
  - 200 OK, 201 Created, 204 No Content
  - 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Validation Failed, 429 Too Many Requests
  - 500 Internal Server Error, 503 Service Unavailable
- Consistent response envelope:
```json
{ "success": true, "data": {...}, "meta": {...} }
{ "success": false, "error": { "code": "...", "message": "...", "details": [] } }
```
- Route params validated (UUID format, int range)
- No verbs in resource paths; use sub-resources for actions
- Pagination, filtering, sorting standardized
- Middleware order: auth → validation → controller
- 404 handler for unmatched routes
- No stack traces or SQL text in production responses
- Deprecation notices for old endpoints

## 9. Request Validation

- Joi schemas for body, query, params
- Shared validation middleware (validate(schema))
- Validation for: required, type, min/max, format, enum, regex
- Sanitize/trim strings, coerce numbers/booleans
- Strip unknown keys (.strict() or .strip())
- Custom error messages with field-level details
- Validate pagination: page >= 1, limit <= 100
- Validate date ranges (start ≤ end)
- Validate file uploads: type, size, count
- Reject oversized payloads (express.json({ limit }))
- Consistent 422 response with field errors
- Validate sort/filter fields against an allowlist before hitting SQL

## 10. Authentication

- Password hashing with bcrypt/argon2 (cost ≥ 10)
- JWT access token (short-lived) + refresh token (long-lived, httpOnly cookie)
- Token signing secret from env, rotated
- Token expiry handled (exp claim)
- Refresh token rotation and revocation (stored hashed in DB)
- Logout invalidates refresh token
- Password reset flow with signed, expiring, single-use tokens
- Email verification flow
- Rate limit login/OTP/reset endpoints
- Account lockout after N failed attempts
- No user enumeration in error messages
- 2FA support if required
- Session invalidation on password change
- Constant-time comparisons for tokens

## 11. Authorization

- Role-based access control (RBAC) middleware
- Resource ownership checks (user can only access own data)
- Permission checks on every protected route
- No client-trusted role/tenant IDs; derive from token/session
- Tenant isolation enforced at query level (WHERE tenant_id = $1)
- Deny by default; whitelist allowed roles
- 403 vs 404 decisions consistent (avoid leaking existence)
- Tests for each role/permission combination
- Row-level security (RLS) considered for multi-tenant

## 12. Controllers

- Thin: parse request, call service, send response
- No business logic
- No direct pool.query calls
- Consistent response helpers (res.success, res.error)
- asyncHandler or try/catch wrapper
- Typed request (Request<Params, ResBody, ReqBody, Query>)
- No sensitive data in response
- Correct status codes

## 13. Services

- Contains all business logic
- Framework-agnostic (no req/res)
- Returns domain objects or throws typed errors
- Uses repositories for data access — never pool directly
- Transactions orchestrated here via withTransaction
- Idempotent where applicable
- Unit-testable in isolation (mock repository)
- No HTTP concerns

## 14. Error Handling

- Centralized error middleware (last in chain)
- Custom AppError class with statusCode, code, message, details
- Known errors mapped to correct HTTP status
- Postgres error codes mapped:
  - 23505 unique violation → 409 Conflict
  - 23503 foreign key violation → 400 or 409
  - 23502 not null violation → 400
  - 22P02 invalid text representation (bad UUID/int) → 400
  - 40001 serialization failure → retry
  - 40P01 deadlock → retry
- Joi errors → 422 with field details
- JWT errors → 401
- Unknown errors → 500, logged, generic message
- No stack traces, SQL text, or param values in production responses
- Error codes stable and documented
- Async errors caught (process.on('unhandledRejection'), uncaughtException)

## 15. Middleware

- Order: helmet → cors → body parsers → rate limit → auth → validation → routes → 404 → error handler
- helmet for security headers
- cors with explicit origins, not * in prod
- express.json({ limit }) and urlencoded
- Compression
- Request ID middleware (x-request-id)
- Request logging (method, path, status, duration, requestId)
- Rate limiting per IP/user/route
- Authentication middleware
- Authorization middleware
- Validation middleware
- Idempotency middleware for critical POSTs if needed

## 16. Security

- Helmet enabled
- CORS restricted
- Rate limiting (global + sensitive routes)
- Input validation + sanitization
- Parameterized queries only — no string concatenation into SQL
- No secrets in code or logs
- HTTPS enforced in prod
- Secure cookies: httpOnly, secure, sameSite
- CSRF protection if cookies used
- SQL injection prevented by parameterization + allowlisted sort/filter columns
- XSS prevented (escape output, validate input)
- Mass assignment prevented (whitelist fields)
- File upload: MIME check, size limit, virus scan if possible, store outside webroot
- Dependency audit (npm audit, Dependabot)
- Password policy enforced
- Sensitive data encrypted at rest if required
- PII redacted in logs
- DB user least-privileged (no superuser in app)
- OWASP Top 10 reviewed

## 17. Logging & Monitoring

- Structured JSON logs (pino/winston)
- Log levels: error, warn, info, debug
- Request/response logging with requestId
- Slow query logging with duration and fingerprint (no param values if sensitive)
- No passwords, tokens, or PII in logs
- Error logs include stack, context, requestId
- Centralized log aggregation (Datadog/Loki/CloudWatch)
- Metrics: latency, error rate, throughput, pool stats
- Health and readiness endpoints (DB ping)
- Alerts for error spikes, DB down, pool saturation
- APM/tracing if available (OpenTelemetry)

## 18. Performance

- Database indexes for hot queries
- Query plans reviewed (EXPLAIN ANALYZE) for slow queries
- No N+1 queries; use joins or ANY($1)
- Pagination enforced on list endpoints
- Caching (Redis/in-memory) for expensive reads
- Cache invalidation strategy defined
- Response compression
- Connection pooling tuned (max, timeouts)
- statement_timeout set to prevent runaway queries
- Background jobs for heavy work
- Streaming for large payloads/files (pg-query-stream)
- Timeouts on external calls
- Load testing for critical endpoints
- Prepared statements reused where beneficial

## 19. Caching

- Cache keys namespaced and versioned
- TTL set on every cache entry
- Invalidate on write (mutation)
- Cache stampede prevention (lock/jitter)
- Stale-while-revalidate where useful
- No caching of user-specific data in shared cache without key scoping
- Cache hit/miss metrics

## 20. Background Jobs & Queues

- BullMQ / Bull / Agenda used for async work
- Jobs idempotent
- Retries with exponential backoff
- Dead-letter queue for failures
- Job progress and status tracked
- Concurrency limits
- Scheduled/cron jobs via repeatable jobs
- Graceful worker shutdown
- Failed jobs logged and alertable

## 21. File Uploads

- Multer/Busboy configured with size and count limits
- MIME type and extension validated
- Storage: local (dev) vs S3/GCS (prod)
- Unique filenames (UUID)
- Signed URLs for private files
- Virus/malware scan if required
- Cleanup of orphaned files
- Streaming for large files
- No direct public write access to buckets

## 22. Email / Notifications

- Template-based emails (React Email, MJML, Handlebars)
- Send via queue, not inline
- Retry on failure
- Unsubscribe/preferences honored
- Rate limited to avoid spam flags
- Dev: mailhog/ethereal; Prod: SES/SendGrid/Postmark
- No PII in subject lines
- Bounce/complaint handling

## 23. Configuration & Environment

- .env loaded via dotenv (dev only)
- Env schema validated with Joi at startup
- Fail fast on missing/invalid env
- Separate configs: dev, test, staging, prod
- Secrets from secret manager in prod
- No defaults for secrets
- NODE_ENV respected
- Feature flags externalized
- DATABASE_URL (or split host/port/user/pass/db) validated

## 24. Testing

- Unit tests for services and utils (Vitest/Jest)
- Repository tests against a real Postgres (testcontainers or dedicated test DB)
- Integration tests for routes (Supertest)
- Migrations applied before tests
- Seed data per test suite; truncate between tests
- No shared state between tests
- Coverage threshold enforced
- Mock external services
- E2E tests for critical flows
- CI runs lint + typecheck + tests
- SQL migrations tested against prod-like data volume where relevant

## 25. API Documentation

- OpenAPI 3 spec (swagger-jsdoc or joi-to-openapi)
- Swagger UI at /api-docs (non-prod or protected)
- Every endpoint documented: params, body, responses, errors
- Auth requirements documented
- Examples for requests/responses
- Spec versioned with API
- Postman/Insomnia collection exported

## 26. Rate Limiting & Throttling

- Global rate limit
- Stricter limits on auth, OTP, password reset
- Per-user limits where relevant
- Redis-backed for multi-instance
- 429 with Retry-After
- Whitelist internal services

## 27. Pagination, Filtering, Sorting

- Consistent query params: page, limit/pageSize, sort, order, q, filters
- Max limit enforced
- Cursor/keyset pagination for large/high-churn datasets
- meta in response: total, page, pageSize, totalPages
- Sort fields whitelisted (map to safe column names)
- Filter fields whitelisted
- Search uses indexed columns (tsvector, pg_trgm, or trigram index)
- No ORDER BY ${userInput} — always map to allowlisted columns

## 28. Deployment & DevOps

- Dockerfile multi-stage, non-root user
- .dockerignore present
- Health checks in container
- CI/CD pipeline: lint → typecheck → test → build → migrate → deploy
- Migrations run before app start (migrate up)
- Zero-downtime deploy strategy (expand/contract pattern for schema changes)
- Rollback plan (app + DB)
- Env vars injected by platform
- Logs shipped to aggregator
- Backups scheduled and tested (PITR/WAL if available)
- No latest tag in prod images
- Resource limits set
- DB connection count within Postgres max_connections

## 29. Backups & Data Safety

- Automated daily backups + WAL archiving
- Restore tested periodically
- PITR configured for critical systems
- Backups encrypted
- Backup access restricted
- Retention policy defined and enforced
- Data retention/GDPR deletion flow implemented
- No PII in non-prod databases (or anonymized)

## 30. Overall Quality Gate

- Consistent API design across endpoints
- Business logic separated from HTTP layer
- All SQL parameterized and centralized in repositories
- Validation consistent and centralized
- Auth and authorization enforced everywhere
- Errors handled centrally, no leaks (no SQL text or params in responses)
- Database queries optimized, no N+1, indexes in place
- Transactions used for multi-step writes, clients always released
- Logging structured and safe
- Tests cover happy path + edge cases (unit + integration with real Postgres)
- Migrations versioned, reviewed, and reversible
- Documentation up to date
- No secrets committed
- No unnecessary duplication
- Code is maintainable and scalable
- All N/A items explicitly justified

## 31. Backend Development Checklist (Condensed)

### Project & Structure

- Clean, scalable, feature-based structure
- Layered: routes → controller → service → repository
- All SQL in repository layer

### Database (pg)

- Single Pool singleton, graceful shutdown
- Parameterized queries only
- Transactions with withTransaction helper and client.release()
- statement_timeout and pool sizing configured
- Slow query logging

### Schema & Migrations

- Migration tool used consistently, forward + rollback
- Constraints, FKs, indexes, TIMESTAMPTZ, soft delete where needed
- Seeds idempotent, dev/test only

### API

- RESTful, versioned, consistent responses
- Correct HTTP methods and status codes
- 404 and centralized error handlers

### Validation

- Joi schemas for body/query/params
- Shared validation middleware
- Sort/filter fields allowlisted

### Auth & Authorization

- Hashing, JWT, refresh rotation
- RBAC + ownership checks
- Rate limiting on sensitive routes

### Errors & Logging

- Centralized error handler
- Postgres error codes mapped (23505, 23503, 22P02, etc.)
- Structured logs, no PII, no SQL params

### Performance & Security

- Indexes, pagination, caching, background jobs
- Helmet, CORS, rate limit, input sanitization
- No secrets in code/logs, least-privileged DB user

### Testing & Docs

- Unit + integration (real Postgres) + E2E
- OpenAPI docs in sync
- CI runs lint, typecheck, tests

### Deployment

- Docker, CI/CD, migrations before start, health checks
- Backups tested, rollback plan, expand/contract for schema changes

### Overall

- Consistent, maintainable, scalable
- No duplication, all states handled
- All N/A items justified
