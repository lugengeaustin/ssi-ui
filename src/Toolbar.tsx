import * as React from "react";
import { cn } from "./cn";

// Toolbar — horizontal action/filter bar with a left cluster and a pushed-right
// cluster. Wraps on narrow widths.
export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Right-aligned cluster (e.g. primary action). */
  end?: React.ReactNode;
}

export function Toolbar({ end, className, children, ...props }: ToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {end && <div className="ml-auto flex flex-wrap items-center gap-2">{end}</div>}
    </div>
  );
}
