"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Shared, URL-synced list state for every admin list page (Standards §5/§13:
 * pagination/search/sort/filters are common list state, kept in the URL so
 * Back/forward, refresh, and sharing a link preserve them).
 *
 * - `page`, `limit`, `sort`, `order`, `q` are the standard list params;
 * - every other query param is treated as a filter (`status`, `role`,
 *   `instituteId`, ...) and is passed through to the API untouched;
 * - the search box debounces (300ms) and resets to page 1 on change;
 * - writes use `router.replace` so typing does not spam history.
 *
 * NOTE: `useSearchParams` requires a Suspense boundary at build time - every
 * page using this hook wraps its content in `<Suspense>`.
 */

const PAGE_PARAM = "page";
const LIMIT_PARAM = "limit";
const SORT_PARAM = "sort";
const ORDER_PARAM = "order";
const QUERY_PARAM = "q";

const STANDARD_PARAMS = new Set([PAGE_PARAM, LIMIT_PARAM, SORT_PARAM, ORDER_PARAM, QUERY_PARAM]);

export interface AdminListState {
  /** 1-based (server convention). */
  page: number;
  pageSize: number;
  sort: string;
  order: "asc" | "desc";
  /** Debounced search text as stored in the URL (`""` when unset). */
  q: string;
  /** Live search input value (not yet debounced). */
  search: string;
  setSearch: (value: string) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (sort: string, order: "asc" | "desc") => void;
  /** Set ("" / undefined removes) one extra endpoint filter, e.g. `status`. */
  setFilter: (key: string, value: string | undefined) => void;
  /** Extra endpoint filters currently in the URL. */
  filters: Record<string, string>;
  /** Standard list params ready for query keys / api calls. */
  listParams: {
    page: number;
    limit: number;
    sort: string;
    order: "asc" | "desc";
    q?: string;
  };
}

interface AdminListStateOptions {
  defaultPageSize?: number;
  defaultSort?: string;
  defaultOrder?: "asc" | "desc";
}

export function useAdminListState({
  defaultPageSize = 20,
  defaultSort = "createdAt",
  defaultOrder = "desc",
}: AdminListStateOptions = {}): AdminListState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get(PAGE_PARAM)) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get(LIMIT_PARAM)) || defaultPageSize),
  );
  const sort = searchParams.get(SORT_PARAM) || defaultSort;
  const order = (searchParams.get(ORDER_PARAM) as "asc" | "desc" | null) || defaultOrder;
  const q = searchParams.get(QUERY_PARAM) || "";

  const [search, setSearch] = useState(q);

  // Keep the input in sync when the URL changes underneath us (Back/forward,
  // a reset from elsewhere) - never while the user is still typing, because
  // the URL only changes after the debounce fires. Adjusting state during
  // render (react.dev "You Might Not Need an Effect") avoids the
  // setState-in-effect cascade and stays correct under StrictMode.
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setSearch(q);
  }

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void, options?: { resetPage?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      if (options?.resetPage) params.delete(PAGE_PARAM);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // Debounced search -> URL (and back to the first page).
  useEffect(() => {
    if (search === q) return;
    const timer = setTimeout(() => {
      updateParams(
        (params) => {
          if (search) params.set(QUERY_PARAM, search);
          else params.delete(QUERY_PARAM);
        },
        { resetPage: true },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [search, q, updateParams]);

  const setPage = useCallback(
    (next: number) => {
      updateParams((params) => {
        if (next <= 1) params.delete(PAGE_PARAM);
        else params.set(PAGE_PARAM, String(next));
      });
    },
    [updateParams],
  );

  const setPageSize = useCallback(
    (size: number) => {
      updateParams(
        (params) => {
          if (size === defaultPageSize) params.delete(LIMIT_PARAM);
          else params.set(LIMIT_PARAM, String(size));
        },
        { resetPage: true },
      );
    },
    [updateParams, defaultPageSize],
  );

  const setSort = useCallback(
    (nextSort: string, nextOrder: "asc" | "desc") => {
      updateParams((params) => {
        if (nextSort === defaultSort) params.delete(SORT_PARAM);
        else params.set(SORT_PARAM, nextSort);
        if (nextOrder === defaultOrder) params.delete(ORDER_PARAM);
        else params.set(ORDER_PARAM, nextOrder);
      });
    },
    [updateParams, defaultSort, defaultOrder],
  );

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      updateParams(
        (params) => {
          if (!value) params.delete(key);
          else params.set(key, value);
        },
        { resetPage: true },
      );
    },
    [updateParams],
  );

  const filters = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (!STANDARD_PARAMS.has(key) && value) out[key] = value;
    }
    return out;
  }, [searchParams]);

  const listParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      sort,
      order,
      ...(q ? { q } : {}),
    }),
    [page, pageSize, sort, order, q],
  );

  return {
    page,
    pageSize,
    sort,
    order,
    q,
    search,
    setSearch,
    setPage,
    setPageSize,
    setSort,
    setFilter,
    filters,
    listParams,
  };
}
