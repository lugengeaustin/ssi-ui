import * as React from "react";
import { cn } from "./cn";

// Skeleton — shimmering placeholder block. Compose for richer loading states.
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tailwind width/height go via className; these are convenience shortcuts. */
  w?: string | number;
  h?: string | number;
  rounded?: "sm" | "md" | "full" | "field";
}

const round: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
  sm: "rounded",
  md: "rounded-md",
  field: "rounded-field",
  full: "rounded-full",
};

export function Skeleton({
  w,
  h = 12,
  rounded = "md",
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn("skeleton-track animate-shimmer", round[rounded], className)}
      style={{ width: w, height: h, ...style }}
      {...props}
    />
  );
}

// SkeletonText — N shimmer lines for paragraph placeholders.
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} h={10} w={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

// ── Wave-1 presets — the standard loaders for list/table/card screens ─────────
// Drop these into a route's loading.tsx so navigation shows structure instantly
// instead of a spinner. Shapes intentionally mirror PageHeader + DataTable and
// the card grid, so the skeleton "becomes" the content it stands in for.

/** Page header + N table-ish rows — the default list-screen loader. */
export function SkeletonRows({
  rows = 8,
  header = true,
  className,
}: {
  rows?: number;
  /** Include the page-title block above the rows. */
  header?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-5", className)} role="status" aria-label="Loading">
      {header && (
        <div className="space-y-2">
          <Skeleton h={22} w={220} />
          <Skeleton h={12} w={320} />
        </div>
      )}
      <div className="overflow-hidden rounded-card border border-line bg-card">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-line px-5 py-3.5 last:border-b-0"
          >
            <Skeleton h={12} className="flex-[2]" />
            <Skeleton h={12} className="hidden flex-1 sm:block" />
            <Skeleton h={12} className="hidden flex-1 md:block" />
            <Skeleton h={20} w={64} rounded="full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Page header + a responsive grid of card placeholders (catalogs, dashboards). */
export function SkeletonCards({
  cards = 6,
  header = true,
  className,
}: {
  cards?: number;
  header?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-5", className)} role="status" aria-label="Loading">
      {header && (
        <div className="space-y-2">
          <Skeleton h={22} w={220} />
          <Skeleton h={12} w={320} />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-card border border-line bg-card p-5">
            <Skeleton h={14} w="70%" />
            <SkeletonText lines={2} />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton h={26} w={84} rounded="full" />
              <Skeleton h={26} w={64} rounded="full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
