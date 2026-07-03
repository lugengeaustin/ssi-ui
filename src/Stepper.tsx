"use client";

import * as React from "react";
import { cn } from "./cn";
import { IconCheck } from "./icons";

// ── Stepper — progress header for guided wizards ─────────────────────────────
// Presentation-only. The parent owns the active index; this renders the numbered
// dots + labels + a connecting progress line. Used by the engagement-setup and
// invite-teammate wizards. Keeps the brand look (blue-soft, gradient on done).
export interface StepperStep {
  /** Short label shown under the dot. */
  label: string;
}

export interface StepperProps {
  steps: StepperStep[];
  /** Zero-based index of the active step. */
  current: number;
  className?: string;
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol
      className={cn("flex items-start", className)}
      aria-label="Progress"
    >
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const isLast = i === steps.length - 1;
        return (
          <li
            key={i}
            className="flex flex-1 flex-col items-center"
            aria-current={active ? "step" : undefined}
          >
            <div className="flex w-full items-center">
              {/* left connector (hidden for the first dot) */}
              <span
                className={cn(
                  "h-0.5 flex-1",
                  i === 0 ? "opacity-0" : done || active ? "bg-blue" : "bg-line",
                )}
              />
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-medium transition-calm",
                  done
                    ? "border-transparent bg-blue text-card"
                    : active
                      ? "border-blue bg-blue-soft text-blue"
                      : "border-line bg-card text-muted",
                )}
              >
                {done ? <IconCheck size={15} /> : i + 1}
              </span>
              {/* right connector (hidden for the last dot) */}
              <span
                className={cn(
                  "h-0.5 flex-1",
                  isLast ? "opacity-0" : done ? "bg-blue" : "bg-line",
                )}
              />
            </div>
            <span
              className={cn(
                "mt-1.5 px-1 text-center text-[11px] leading-tight",
                active ? "font-medium text-ink" : "text-muted",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
