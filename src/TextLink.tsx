import * as React from "react";
import { cn } from "./cn";

// Framework-agnostic anchor; apps needing client-side prefetch can wrap with
// their router's Link.
// TextLink — inline text link with a calm colour transition + hover underline.
// The Calm Studio default for in-body links (record names, "view all", etc.).
// Renders a plain <a>; pass `href` directly for navigation, or wrap your
// router's Link and apply `linkClass()` / `textLinkClass`.
export interface TextLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Muted resting colour that warms to brand blue on hover (for subtle links). */
  subtle?: boolean;
}

// Shared class — exported so existing link call-sites can adopt the same
// treatment without swapping their element (`<a className={linkClass()} />`).
export function linkClass(opts?: { subtle?: boolean }): string {
  return cn(
    "transition-calm font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-[3px]",
    opts?.subtle
      ? "text-muted hover:text-blue"
      : "text-blue hover:text-blue-deep",
  );
}

// Static class-string variant (eresearch's "Link" treatment) — kept so
// call-sites that spread a constant className onto their router's Link resolve.
export const textLinkClass =
  "inline-flex items-center gap-1 rounded-[3px] font-medium text-blue underline decoration-blue/30 " +
  "decoration-1 underline-offset-2 transition-calm hover:decoration-blue hover:underline-offset-[3px] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1";

export const TextLink = React.forwardRef<HTMLAnchorElement, TextLinkProps>(
  function TextLink({ subtle = false, className, ...props }, ref) {
    return (
      <a ref={ref} className={cn(linkClass({ subtle }), className)} {...props} />
    );
  },
);
