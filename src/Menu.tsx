"use client";

import * as React from "react";
import { cn } from "./cn";

export interface MenuItem {
  label: React.ReactNode;
  onSelect?: () => void;
  href?: string;
  icon?: React.ReactNode;
  /** Danger styling for destructive actions. */
  danger?: boolean;
  disabled?: boolean;
}

export interface MenuProps {
  /** Element that toggles the menu. Cloned with click/aria wiring. */
  trigger: React.ReactNode;
  items: (MenuItem | "separator")[];
  align?: "start" | "end";
  className?: string;
}

// Dropdown menu — click to open, Esc / outside-click / select to close.
// Hand-rolled, accessible (role=menu / menuitem, focus returns to trigger).
export function Menu({ trigger, items, align = "start", className }: MenuProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerEl = React.isValidElement(trigger)
    ? React.cloneElement(trigger as React.ReactElement, {
        onClick: (e: React.MouseEvent) => {
          (trigger as React.ReactElement).props.onClick?.(e);
          setOpen((v) => !v);
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
      })
    : trigger;

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      {triggerEl}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-40 mt-1.5 min-w-[180px] animate-scale-in overflow-hidden rounded-card border border-line bg-card p-1 shadow-pop",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((it, i) => {
            if (it === "separator") {
              return <div key={`sep-${i}`} className="my-1 h-px bg-line" />;
            }
            const cls = cn(
              "flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-sm transition-calm",
              it.danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-blue-soft",
              it.disabled && "pointer-events-none opacity-50",
            );
            const content = (
              <>
                {it.icon && <span className="shrink-0 text-muted">{it.icon}</span>}
                <span className="truncate">{it.label}</span>
              </>
            );
            if (it.href) {
              return (
                <a key={i} role="menuitem" href={it.href} className={cls} onClick={() => setOpen(false)}>
                  {content}
                </a>
              );
            }
            return (
              <button
                key={i}
                role="menuitem"
                type="button"
                disabled={it.disabled}
                className={cls}
                onClick={() => {
                  setOpen(false);
                  it.onSelect?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
