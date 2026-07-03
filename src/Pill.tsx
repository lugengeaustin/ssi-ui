import * as React from "react";
import { cn } from "./cn";
import { toneForStatus } from "./status";

export type PillTone = "muted" | "blue" | "green" | "gold" | "red";
export type PillSize = "sm" | "md";

const tones: Record<PillTone, string> = {
  muted: "bg-[var(--line)] text-muted",
  blue: "bg-blue-soft text-blue",
  green: "bg-green-soft text-green-deep",
  gold: "bg-gold-soft text-warn",
  red: "bg-danger-soft text-danger",
};

const pillSizes: Record<PillSize, string> = {
  sm: "h-5 px-2 text-[11px]",
  md: "h-6 px-2.5 text-xs",
};

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
  size?: PillSize;
  /** Optional leading dot. */
  dot?: boolean;
}

// Pill — soft, rounded status chip. Base for Badge + StatusBadge.
export function Pill({
  tone = "muted",
  size = "md",
  dot = false,
  className,
  children,
  ...props
}: PillProps) {
  return (
    <span
      className={cn(
        "transition-calm inline-flex items-center gap-1.5 rounded-pill font-medium leading-none",
        tones[tone],
        pillSizes[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current opacity-70" />
      )}
      {children}
    </span>
  );
}

// Badge — alias of Pill for count/label semantics (same visual system).
export type BadgeProps = PillProps;
export function Badge(props: BadgeProps) {
  return <Pill {...props} />;
}

// StatusBadge — maps a domain status string to its Calm Studio tone.
// The label defaults to a humanized version of the status.
export interface StatusBadgeProps extends Omit<PillProps, "tone" | "children"> {
  status: string | null | undefined;
  /** Override the rendered label (defaults to humanized status). */
  label?: React.ReactNode;
}

function humanize(s: string | null | undefined): string {
  if (!s) return "—";
  return String(s).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, label, dot = true, ...props }: StatusBadgeProps) {
  return (
    <Pill tone={toneForStatus(status)} dot={dot} {...props}>
      {label ?? humanize(status)}
    </Pill>
  );
}
