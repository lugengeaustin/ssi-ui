import * as React from "react";
import { cn } from "./cn";

// EmptyState — centered icon + title + description + optional action.
// Used by DataTable's empty render and standalone on screens.
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Compact variant for inside tables/cards. */
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-10" : "gap-3 py-16",
        className,
      )}
    >
      {icon && (
        <div className="grad-surface flex h-11 w-11 items-center justify-center rounded-full bg-blue-soft text-blue ring-1 ring-inset ring-blue/10">
          {icon}
        </div>
      )}
      <div className="text-[15px] font-medium text-ink">{title}</div>
      {description && (
        <p className="max-w-sm text-[13px] text-muted">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
