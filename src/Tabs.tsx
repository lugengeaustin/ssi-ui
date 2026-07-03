"use client";

import * as React from "react";
import { cn } from "./cn";

export interface TabItem {
  value: string;
  label: React.ReactNode;
  /** Optional trailing count/badge. */
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** "underline" (default) or "segmented" (pill group). */
  variant?: "underline" | "segmented";
  className?: string;
}

// Tabs — accessible tablist (roving keyboard nav handled by native focus +
// arrow keys). Controlled or uncontrolled. Renders the tab strip only; pair
// with your own panel switch keyed on the active value.
export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  variant = "underline",
  className,
}: TabsProps) {
  const [internal, setInternal] = React.useState(
    defaultValue ?? items[0]?.value,
  );
  const active = value ?? internal;
  function select(v: string) {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  }

  function onKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    let next = idx;
    for (let i = 0; i < items.length; i++) {
      next = (next + dir + items.length) % items.length;
      if (!items[next].disabled) break;
    }
    select(items[next].value);
  }

  if (variant === "segmented") {
    return (
      <div
        role="tablist"
        className={cn(
          "inline-flex gap-1 rounded-pill border border-line bg-canvas p-1",
          className,
        )}
      >
        {items.map((it, idx) => {
          const on = it.value === active;
          return (
            <button
              key={it.value}
              role="tab"
              aria-selected={on}
              disabled={it.disabled}
              tabIndex={on ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, idx)}
              onClick={() => select(it.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[13px] font-medium transition-calm",
                on
                  ? "bg-card text-ink shadow-card"
                  : "text-muted hover:bg-blue-soft/60 hover:text-ink",
                it.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              {it.label}
              {it.badge}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div role="tablist" className={cn("flex gap-1 border-b border-line", className)}>
      {items.map((it, idx) => {
        const on = it.value === active;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={on}
            disabled={it.disabled}
            tabIndex={on ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, idx)}
            onClick={() => select(it.value)}
            className={cn(
              "relative -mb-px inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition-calm",
              on ? "text-ink" : "text-muted hover:text-ink",
              it.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {it.label}
            {it.badge}
            {/* Active indicator — brand gradient hairline along the bottom edge. */}
            <span
              aria-hidden
              className={cn(
                "accent-bar-grad pointer-events-none absolute inset-x-0 -bottom-px h-[2px] rounded-pill transition-calm",
                on ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
