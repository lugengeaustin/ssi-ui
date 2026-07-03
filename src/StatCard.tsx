import * as React from "react";
import { cn } from "./cn";

export interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Small caption under the value (e.g. "this month"). */
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  /** Optional delta indicator. */
  delta?: { value: React.ReactNode; direction: "up" | "down" | "flat" };
  className?: string;
}

// KPI / StatCard — big mono number on a Calm Studio card. The number uses the
// `.num` mono treatment automatically.
export function StatCard({ label, value, hint, icon, delta, className }: StatCardProps) {
  const deltaTone =
    delta?.direction === "up"
      ? "text-green-deep"
      : delta?.direction === "down"
        ? "text-danger"
        : "text-muted";
  return (
    <div
      className={cn(
        "lift relative overflow-hidden rounded-card border border-line bg-card p-5 shadow-card hover:border-blue/20",
        className,
      )}
    >
      {/* Soft brand gradient wash in the corner. */}
      <div aria-hidden className="grad-surface pointer-events-none absolute inset-0" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          {label}
        </div>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-soft text-blue">
            {icon}
          </span>
        )}
      </div>
      <div className="num grad-numeric relative mt-2 text-[28px] font-medium leading-none">
        {value}
      </div>
      {(hint || delta) && (
        <div className="relative mt-2 flex items-center gap-2 text-[12px]">
          {delta && (
            <span className={cn("num font-medium", deltaTone)}>
              {delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "→"}{" "}
              {delta.value}
            </span>
          )}
          {hint && <span className="text-muted">{hint}</span>}
        </div>
      )}
    </div>
  );
}
