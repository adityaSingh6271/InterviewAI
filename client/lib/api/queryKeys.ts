/**
 * Centralized TanStack Query keys (Standards: no duplicated cache keys;
 * invalidation targets are defined once).
 */
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  interviews: {
    all: ["interviews"] as const,
    list: (params: Record<string, unknown>) => ["interviews", "list", params] as const,
    detail: (id: string) => ["interviews", "detail", id] as const,
    /** Nested round rows of one interview (invalidated with `detail`). */
    rounds: (id: string) => ["interviews", "detail", id, "rounds"] as const,
    /** Nested notes of one interview (invalidated with `detail`). */
    notes: (id: string) => ["interviews", "detail", id, "notes"] as const,
    /** Attempts of one interview (student's own; invalidated with `detail`). */
    attempts: (id: string) => ["interviews", "detail", id, "attempts"] as const,
  },
  admin: {
    all: ["admin"] as const,
    /** One resource subtree ("admins" | "institutes" | ...); mutations
     *  invalidate this prefix to refresh its lists, details, and stats. */
    resource: (resource: string) => ["admin", resource] as const,
    /** GET /admin/stats dashboard counters. */
    stats: ["admin", "stats"] as const,
    /**
     * Paginated admin-portal lists: `resource` is the plural endpoint name
     * ("admins" | "institutes" | "students" | "organizations" |
     * "applications" | "attempts" | "interviews" | "llm-configs").
     */
    list: (resource: string, params: object) =>
      ["admin", resource, "list", params] as const,
    /** One row of a resource (create/delete invalidates its `list`). */
    detail: (resource: string, id: string) => ["admin", resource, "detail", id] as const,
    /** Nested sub-list, e.g. nested("students", id, "applications", params). */
    nested: (resource: string, id: string, sub: string, params: object) =>
      ["admin", resource, "detail", id, sub, params] as const,
  },
  applications: {
    all: ["applications"] as const,
    my: (studentId: string) => ["applications", "my", studentId] as const,
    detail: (id: string) => ["applications", "detail", id] as const,
  },
  rounds: {
    all: ["rounds"] as const,
    detail: (id: string) => ["rounds", "detail", id] as const,
    questions: (roundId: string) => ["rounds", roundId, "questions"] as const,
    attempts: (roundId: string) => ["rounds", roundId, "attempts"] as const,
  },
  attempts: {
    all: ["attempts"] as const,
    list: (params: Record<string, unknown> = {}) => ["attempts", "list", params] as const,
  },
  questions: {
    detail: (id: string) => ["questions", "detail", id] as const,
  },
  responses: {
    detail: (id: string) => ["responses", "detail", id] as const,
  },
};
