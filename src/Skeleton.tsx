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
