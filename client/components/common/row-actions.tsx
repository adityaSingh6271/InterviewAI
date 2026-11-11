"use client";

import React from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Kebab menu for table rows (Standards §8/§12: permission-gated actions are
 * rendered conditionally; rows with no available actions render a dash).
 */
export interface RowAction {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** Red destructive styling (pair with a confirmation modal). */
  destructive?: boolean;
  disabled?: boolean;
  testId?: string;
}

interface RowActionsProps {
  actions: RowAction[];
  /** Accessible label for the trigger (defaults to "Row actions"). */
  label?: string;
  testId?: string;
}

export default function RowActions({
  actions,
  label = "Row actions",
  testId = "row-actions",
}: RowActionsProps) {
  const visible = actions.filter((action) => !action.disabled);

  if (visible.length === 0) {
    return (
      <span className="px-1 text-slate-300" aria-label="No actions available">
        —
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          title={label}
          data-testid={testId}
          className="cursor-pointer text-slate-500 hover:text-slate-900"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {actions
          .filter((action) => !action.disabled)
          .map((action) => (
            <DropdownMenuItem
              key={action.label}
              onClick={action.onSelect}
              variant={action.destructive ? "destructive" : "default"}
              data-testid={action.testId}
              className="cursor-pointer"
            >
              {action.icon && <action.icon />}
              {action.label}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
