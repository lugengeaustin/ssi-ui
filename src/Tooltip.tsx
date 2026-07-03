"use client";

import * as React from "react";
import { cn } from "./cn";

export interface TooltipProps {
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactElement;
  className?: string;
}

// Tooltip — CSS-positioned, shown on hover/focus. Lightweight (no portal):
// wrap any focusable/hoverable element. Hidden from AT-redundant content via
// role="tooltip" exposed on focus.
export function Tooltip({ content, side = "top", children, className }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const pos: Record<NonNullable<TooltipProps["side"]>, string> = {
    top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
    left: "right-full top-1/2 mr-2 -translate-y-1/2",
    right: "left-full top-1/2 ml-2 -translate-y-1/2",
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 w-max max-w-xs animate-fade-in whitespace-nowrap rounded-[8px] bg-ink px-2.5 py-1.5 text-xs font-medium text-card shadow-pop",
            pos[side],
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
