import type * as React from "react";

import { cn } from "@/lib/utils";

/** Loading placeholder block (Standards: skeleton, avoid layout shift). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-lg", className)}
      {...props}
    />
  );
}

export { Skeleton };
