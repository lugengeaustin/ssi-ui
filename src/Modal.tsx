"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { Button } from "./Button";
import { IconClose } from "./icons";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

// ── Shared overlay coordination (module-level, across all Modals/Drawers) ─────
// Body-scroll lock is REFERENCE-COUNTED: with two stacked overlays, each used to
// save/restore document.body.style.overflow independently, so closing the outer
// one first would restore "" while the inner is still open — or, worse, leave the
// body permanently `overflow:hidden`. We lock on the first open and unlock only
// when the last closes, snapshotting the pre-lock value once.
let scrollLockCount = 0;
let savedOverflow = "";
// Escape/Tab are handled ONLY by the topmost overlay. Every overlay adds its own
// capturing document keydown listener, and stopPropagation on a document-level
// listener does NOT stop sibling document listeners — so without this, one Escape
// dismissed EVERY stacked overlay at once. Each overlay checks it is on top
// before acting.
const overlayStack: symbol[] = [];

// useOverlay — shared behaviour for Modal + Drawer: portal mount, Esc to close,
// focus trap, restore focus on close, lock body scroll.
function useOverlay(open: boolean, onClose: () => void) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  // Keep the latest onClose in a ref so the focus-trap effect below does NOT
  // re-run when callers pass a fresh inline onClose on every render (which would
  // tear down + re-establish the trap on each keystroke and steal focus out of
  // the field — making text inputs in a Modal impossible to type into).
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement as HTMLElement | null;

    // Reference-counted body-scroll lock (snapshot pre-lock value once).
    if (scrollLockCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    scrollLockCount += 1;

    // Register on the overlay stack so only the topmost handles Esc/Tab.
    const token = Symbol("overlay");
    overlayStack.push(token);
    const isTop = () => overlayStack[overlayStack.length - 1] === token;

    // Focus first focusable inside the panel.
    const id = window.setTimeout(() => {
      const node = ref.current;
      if (!node) return;
      const first = node.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? node).focus();
    }, 0);

    function onKey(e: KeyboardEvent) {
      // Only the topmost overlay reacts — a stacked overlay must not swallow keys
      // meant for the one above it, and Esc must close just the top one.
      if (!isTop()) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && ref.current) {
        const nodes = Array.from(
          ref.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((n) => n.offsetParent !== null);
        if (nodes.length === 0) {
          e.preventDefault();
          return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      // Pop this overlay off the stack (it may not be the last if unmount order
      // differs from mount order, so filter by identity).
      const idx = overlayStack.lastIndexOf(token);
      if (idx !== -1) overlayStack.splice(idx, 1);
      // Release the scroll lock only when the LAST overlay closes.
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0) document.body.style.overflow = savedOverflow;
      window.clearTimeout(id);
      prevActive?.focus?.();
    };
  }, [open]);

  return { ref, mounted };
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Footer slot (typically buttons). */
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** Disable overlay-click-to-close (e.g. destructive confirms). */
  dismissable?: boolean;
  className?: string;
}

const modalSizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissable = true,
  className,
}: ModalProps) {
  const { ref, mounted } = useOverlay(open, onClose);
  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center overflow-y-auto bg-[rgba(20,30,60,0.28)] p-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={dismissable ? onClose : undefined}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "w-full animate-scale-in rounded-card border border-line bg-card shadow-pop outline-none",
          modalSizes[size],
          className,
        )}
      >
        {(title || dismissable) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              {title && <h2 className="text-[16px] font-medium text-ink">{title}</h2>}
              {description && (
                <p className="mt-0.5 text-[13px] text-muted">{description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Close"
              onClick={onClose}
              leftIcon={<IconClose size={18} />}
            />
          </div>
        )}
        {children && <div className="px-5 py-4 text-sm text-ink">{children}</div>}
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export interface DrawerProps extends Omit<ModalProps, "size"> {
  side?: "right" | "left";
  width?: number;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = "right",
  width = 420,
  dismissable = true,
  className,
}: DrawerProps) {
  const { ref, mounted } = useOverlay(open, onClose);
  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade-in bg-[rgba(20,30,60,0.28)] backdrop-blur-sm"
      style={{ justifyContent: side === "right" ? "flex-end" : "flex-start" }}
      onMouseDown={dismissable ? onClose : undefined}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "flex h-full animate-slide-in-right flex-col border-line bg-card shadow-pop outline-none",
          side === "right" ? "border-l" : "border-r",
          className,
        )}
        style={{ width: `min(${width}px, 100vw)` }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-[16px] font-medium text-ink">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-[13px] text-muted">{description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Close"
            onClick={onClose}
            leftIcon={<IconClose size={18} />}
          />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-ink">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
