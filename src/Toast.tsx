"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { IconCheck, IconAlert, IconInfo, IconClose } from "./icons";

export type ToastTone = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  duration: number;
}

type Listener = (toasts: ToastItem[]) => void;

// Tiny external store so toast() works from anywhere (no context required),
// while <Toaster /> subscribes and renders. One Toaster per app.
const store = (() => {
  let toasts: ToastItem[] = [];
  let seq = 0;
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l([...toasts]));

  return {
    subscribe(l: Listener) {
      listeners.add(l);
      l([...toasts]);
      return () => {
        listeners.delete(l);
      };
    },
    add(t: Omit<ToastItem, "id">) {
      const id = ++seq;
      toasts = [...toasts, { ...t, id }];
      emit();
      if (t.duration > 0) {
        setTimeout(() => store.dismiss(id), t.duration);
      }
      return id;
    },
    dismiss(id: number) {
      toasts = toasts.filter((t) => t.id !== id);
      emit();
    },
  };
})();

export interface ToastOptions {
  description?: React.ReactNode;
  /** ms before auto-dismiss. 0 = sticky. Default 4000. */
  duration?: number;
}

function push(tone: ToastTone, title: React.ReactNode, opts?: ToastOptions) {
  return store.add({
    tone,
    title,
    description: opts?.description,
    duration: opts?.duration ?? 4000,
  });
}

// toast() API — toast.success(...), toast.error(...), toast.info(...).
export const toast = Object.assign(
  (title: React.ReactNode, opts?: ToastOptions) => push("info", title, opts),
  {
    success: (title: React.ReactNode, opts?: ToastOptions) => push("success", title, opts),
    error: (title: React.ReactNode, opts?: ToastOptions) => push("error", title, opts),
    info: (title: React.ReactNode, opts?: ToastOptions) => push("info", title, opts),
    dismiss: (id: number) => store.dismiss(id),
  },
);

const toneStyles: Record<ToastTone, { icon: React.ReactNode; accent: string }> = {
  success: { icon: <IconCheck size={16} />, accent: "text-green-deep bg-green-soft" },
  error: { icon: <IconAlert size={16} />, accent: "text-danger bg-danger-soft" },
  info: { icon: <IconInfo size={16} />, accent: "text-blue bg-blue-soft" },
};

// Toaster — mount once near the app root (e.g. in AppChrome).
export function Toaster() {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    return store.subscribe(setItems);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {items.map((t) => {
        const tone = toneStyles[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-card border border-line bg-card p-3.5 shadow-pop"
          >
            <span
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                tone.accent,
              )}
            >
              {tone.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink">{t.title}</div>
              {t.description && (
                <div className="mt-0.5 text-[13px] text-muted">{t.description}</div>
              )}
            </div>
            <button
              aria-label="Dismiss"
              onClick={() => store.dismiss(t.id)}
              className="-m-1 rounded p-1 text-muted hover:text-ink"
            >
              <IconClose size={15} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
