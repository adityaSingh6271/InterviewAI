import React from "react";

/**
 * Consistent page header for every admin screen: title, one-line context,
 * optional right-aligned actions (primary create button, refresh, ...).
 */
interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  testId?: string;
}

export default function AdminPageHeader({
  title,
  description,
  actions,
  testId,
}: AdminPageHeaderProps) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
