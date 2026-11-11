"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StoreProvider from "@/lib/redux/StoreProvider";
import { AuthProvider } from "./AuthProvider";

/** App-wide providers: Redux Toolkit (global & persisted state) + TanStack Query + Auth. */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <StoreProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </StoreProvider>
  );
}
