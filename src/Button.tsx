import * as React from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium transition-calm " +
  "active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50 select-none whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  // Subtle brand gradient that deepens on hover; lift on hover, settle on press.
  primary:
    "grad-primary grad-primary-hover text-card shadow-card hover:shadow-lift hover:-translate-y-px active:translate-y-px active:shadow-card",
  // Smooth tint + warmer hairline + gentle lift on hover.
  secondary:
    "bg-card text-ink border border-line hover:border-blue/30 hover:bg-blue-soft/50 hover:shadow-lift",
  ghost: "bg-transparent text-ink hover:bg-blue-soft hover:text-blue",
  danger: "bg-danger text-card hover:brightness-95 hover:shadow-lift hover:-translate-y-px active:translate-y-px",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

const iconOnlySizes: Record<ButtonSize, string> = {
  sm: "h-8 w-8 p-0",
  md: "h-10 w-10 p-0",
  lg: "h-12 w-12 p-0",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Render icon before the label. */
  leftIcon?: React.ReactNode;
  /** Render icon after the label. */
  rightIcon?: React.ReactNode;
  /** Square icon-only button (no text child). */
  iconOnly?: boolean;
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      iconOnly = false,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          base,
          variants[variant],
          iconOnly ? iconOnlySizes[size] : sizes[size],
          className,
        )}
        {...props}
      >
        {loading ? <Spinner /> : leftIcon}
        {!iconOnly && children}
        {!loading && rightIcon}
      </button>
    );
  },
);
