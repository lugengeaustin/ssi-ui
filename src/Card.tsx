import * as React from "react";
import { cn } from "./cn";

// Card — the Calm Studio white surface (18px radius, hairline, whisper shadow).
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Inner padding. Default "md". Use "none" when the card wraps a flush table. */
  padding?: "none" | "sm" | "md" | "lg";
  /**
   * Clickable affordance — adds hover lift (shadow-lift → -pop), a soft brand
   * gradient sheen, a brand accent-bar that reveals along the top edge, and the
   * pointer/role/keyboard wiring. Static cards stay flat (no false lift).
   */
  interactive?: boolean;
  /**
   * Add a soft brand gradient sheen + deeper "pop" shadow that fade in on hover,
   * WITHOUT the clickable role/keyboard wiring. For inviting, tappable surfaces
   * (catalog/course/programme cards) whose click is handled by a child link.
   */
  sheen?: boolean;
}

const pad: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-7",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = "md", interactive = false, sheen = false, className, children, onClick, ...props },
  ref,
) {
  const clickable = interactive || onClick != null;
  // `sheen` gives the inviting hover treatment without the button semantics —
  // used for cards whose click is delegated to a child link.
  const sheeny = sheen && !clickable;
  return (
    <div
      ref={ref}
      onClick={onClick}
      // A11y wiring is gated on `clickable` (interactive OR onClick), not on
      // onClick alone — an `interactive` card promises a clickable affordance, so
      // it must be keyboard-reachable (role=button, tabIndex, Enter/Space) even
      // when the click is delegated. Otherwise the pointer/lift styling renders
      // for a card no keyboard/AT user can reach.
      role={clickable ? "button" : props.role}
      tabIndex={clickable ? 0 : props.tabIndex}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                (e.currentTarget as HTMLDivElement).click();
              }
              props.onKeyDown?.(e);
            }
          : props.onKeyDown
      }
      className={cn(
        "relative rounded-card border border-line bg-card shadow-card",
        clickable
          ? "lift card-interactive group cursor-pointer overflow-hidden hover:border-blue/30 hover:shadow-pop active:translate-y-0 active:shadow-lift"
          : sheeny
            ? "group overflow-hidden lift-pop hover:border-blue/30"
            : "hover:border-blue/20",
        pad[padding],
        className,
      )}
      {...props}
    >
      {(clickable || sheeny) && (
        <>
          {/* Brand accent-bar reveals along the top edge on hover (clickable only). */}
          {clickable && (
            <span
              aria-hidden
              className="accent-bar-grad pointer-events-none absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 opacity-0 transition-[transform,opacity] duration-[var(--dur-base)] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 group-hover:opacity-100"
            />
          )}
          {/* Whisper-soft gradient sheen fades in on hover. */}
          <span aria-hidden className="card-sheen pointer-events-none absolute inset-0 z-0 rounded-[inherit]" />
        </>
      )}
      {clickable || sheeny ? <span className="relative z-10 block">{children}</span> : children}
    </div>
  );
});

// Panel — a card with a titled header strip, optional actions slot.
export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Pass "none" to render the body flush (e.g. wrapping a DataTable). */
  bodyPadding?: CardProps["padding"];
}

export function Panel({
  title,
  description,
  actions,
  bodyPadding = "md",
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-line bg-card shadow-card",
        className,
      )}
      {...props}
    >
      {/* Thin brand gradient accent along the top edge. */}
      <div aria-hidden className="accent-bar-grad h-[3px] w-full" />
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title && <div className="text-[15px] font-medium text-ink">{title}</div>}
            {description && (
              <div className="mt-0.5 text-[13px] text-muted">{description}</div>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(pad[bodyPadding])}>{children}</div>
    </div>
  );
}

// Section — vertical rhythm wrapper with an optional small heading.
export interface SectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
}

export function Section({ title, className, children, ...props }: SectionProps) {
  return (
    <section className={cn("space-y-3", className)} {...props}>
      {title && (
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

// PageHeader — title + subtitle + right-aligned actions slot.
export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] font-medium leading-tight text-ink">{title}</h1>
        {/* Thin brand gradient accent under the title. */}
        <div aria-hidden className="accent-bar-grad mt-2 h-[3px] w-10 rounded-pill" />
        {subtitle && <p className="mt-2 max-w-2xl text-[13px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
