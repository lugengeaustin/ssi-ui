"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { Pill } from "./Pill";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import {
  FIND_APP_BASE_URLS,
  findDestination,
  findHighlight,
  groupFindResults,
  toFindResults,
} from "./find";
import type { FindDestination, FindGroup, FindResult } from "./find";
import {
  IconAlert,
  IconBook,
  IconBriefcase,
  IconBuilding,
  IconCheckSquare,
  IconClipboard,
  IconClose,
  IconFile,
  IconFileText,
  IconReceipt,
  IconSearch,
  IconUser,
} from "./icons";
import type { IconProps } from "./icons";

// ── SSI Find — the suite-wide ⌘K command palette ─────────────────────────────
// One search box over every app: clients, contacts, engagements, tasks,
// proposals, files, courses, invoices, receipts, tenders, team members and
// brand documents. Results come from the live `public.ssi_search(q, max_rows)`
// RPC, which does tenant + staff scoping server-side and refuses anon callers.
//
// How the Supabase client gets here: the SAME way the theme engine gets its
// persistence — the package never imports `@supabase/supabase-js`; the app
// hands in what it already has. ThemeProvider takes `onModeChange`, FindPalette
// takes `client`. That keeps @ssi/ui dependency-free and app-agnostic, and the
// structural `FindSearchClient` type means any browser client with `.rpc()`
// (or a stub, in tests) satisfies it.
//
//   <FindPalette client={supabase} currentApp="e-office" onNavigate={router.push} />
//   <FindButton />            // topbar trigger, opens the same palette
//
// Only `.rpc` is used, so a Supabase browser client drops straight in.

/** Minimal structural view of a Supabase browser client (only `.rpc` is used). */
export interface FindSearchClient {
  rpc(
    fn: string,
    args?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

const MIN_QUERY = 2;
const DEFAULT_DEBOUNCE_MS = 250;
const DEFAULT_MAX_ROWS = 6;
/** Shown instead of any PostgREST/network text — errors must never leak. */
const ERROR_TITLE = "Search is unavailable";
const ERROR_BODY = "We could not reach search just now. Check your connection and try again.";

// ── Shared open-state store ──────────────────────────────────────────────────
// Same tiny-external-store shape as toast()/<Toaster />: <FindButton /> (or any
// code) can open the palette without threading state through the tree. One
// palette per app shell. Apps that prefer explicit state can drive the
// component with `open` / `onOpenChange` instead — the store is then bypassed.

type OpenListener = (open: boolean) => void;

const findStore = (() => {
  let open = false;
  const listeners = new Set<OpenListener>();
  return {
    subscribe(listener: OpenListener) {
      listeners.add(listener);
      listener(open);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next: boolean) {
      if (next === open) return;
      open = next;
      listeners.forEach((l) => l(open));
    },
    get() {
      return open;
    },
  };
})();

/** Open the palette from anywhere (topbar button, menu item, shortcut card). */
export function openFind() {
  findStore.set(true);
}
/** Close the palette from anywhere. */
export function closeFind() {
  findStore.set(false);
}

/** Subscribe to the shared palette state — `{ open, setOpen, toggle }`. */
export function useFindPalette(): {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
} {
  const [open, setOpenState] = React.useState(false);
  React.useEffect(() => findStore.subscribe(setOpenState), []);
  const setOpen = React.useCallback((next: boolean) => findStore.set(next), []);
  const toggle = React.useCallback(() => findStore.set(!findStore.get()), []);
  return { open, setOpen, toggle };
}

// ── Kind → glyph ─────────────────────────────────────────────────────────────

const KIND_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  client: IconBuilding,
  "finance client": IconBuilding,
  contact: IconUser,
  "team member": IconUser,
  engagement: IconBriefcase,
  task: IconCheckSquare,
  proposal: IconFileText,
  tender: IconClipboard,
  file: IconFile,
  "brand document": IconFileText,
  course: IconBook,
  invoice: IconReceipt,
  receipt: IconReceipt,
};

function KindIcon({ kind }: { kind: string }) {
  const Glyph = KIND_ICONS[kind] ?? IconSearch;
  return <Glyph size={16} />;
}

// ── Palette ──────────────────────────────────────────────────────────────────

type FindStatus = "idle" | "loading" | "ready" | "error";

export interface FindPaletteProps {
  /** The app's Supabase browser client — only `.rpc("ssi_search", …)` is used. */
  client: FindSearchClient;
  /** Which app this palette runs in; its own results navigate in-app. */
  currentApp: string;
  /** Controlled open state. Omit to use the shared ⌘K / <FindButton /> store. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** In-app navigation (e.g. Next's `router.push`) for same-app results. */
  onNavigate?: (path: string) => void;
  /** Override entries of FIND_APP_BASE_URLS (preview deploys, custom domains). */
  baseUrls?: Record<string, string>;
  /** Rows requested per query (RPC default 6). */
  maxRows?: number;
  /** Debounce before the query is sent. */
  debounceMs?: number;
  placeholder?: string;
  /** Notified on selection; return `false` to suppress the default navigation. */
  onSelect?: (result: FindResult, destination: FindDestination) => void | false;
  className?: string;
}

export function FindPalette({
  client,
  currentApp,
  open: openProp,
  onOpenChange,
  onNavigate,
  baseUrls,
  maxRows = DEFAULT_MAX_ROWS,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  placeholder = "Search the SSI suite…",
  onSelect,
  className,
}: FindPaletteProps) {
  const store = useFindPalette();
  const controlled = typeof openProp === "boolean";
  const open = controlled ? (openProp as boolean) : store.open;
  const storeSetOpen = store.setOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!controlled) storeSetOpen(next);
      onOpenChange?.(next);
    },
    [controlled, storeSetOpen, onOpenChange],
  );

  const [mounted, setMounted] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<FindResult[]>([]);
  const [status, setStatus] = React.useState<FindStatus>("idle");
  const [active, setActive] = React.useState(0);

  const panelRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const rowRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  // Monotonic request id — the stale-response guard. Every effect run claims a
  // new id; a response whose id is no longer current is dropped, so a slow
  // answer to an old query can never overwrite a newer one.
  const requestSeq = React.useRef(0);
  // The client is held in a ref so an app that constructs it inline (a new
  // object identity every render) does not restart the search effect forever.
  const clientRef = React.useRef(client);
  clientRef.current = client;
  const openRef = React.useRef(open);
  openRef.current = open;

  const rawId = React.useId();
  const baseId = `ssi-find-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-opt-${index}`;

  React.useEffect(() => setMounted(true), []);

  // ── ⌘K / Ctrl+K toggle (always armed, even while closed) ───────────────────
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key !== "k" && e.key !== "K") return;
      e.preventDefault();
      setOpen(!openRef.current);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setOpen]);

  // ── Open/close side-effects: scroll lock, focus, trap, restore ─────────────
  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    inputRef.current?.select();

    // Focus trap: Tab is intercepted below, but a stray programmatic focus (or
    // browser chrome) must not strand the user outside the dialog.
    function onFocusIn(e: FocusEvent) {
      const panel = panelRef.current;
      const target = e.target as Node | null;
      if (panel && target && !panel.contains(target)) inputRef.current?.focus();
    }
    document.addEventListener("focusin", onFocusIn);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.body.style.overflow = savedOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  // ── Debounced, cancellable search ──────────────────────────────────────────
  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    // Claim an id for this query BEFORE anything can resolve, so in-flight
    // responses from previous queries are already stale.
    const id = ++requestSeq.current;

    if (q.length < MIN_QUERY) {
      setRows([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    const timer = setTimeout(() => {
      Promise.resolve(clientRef.current.rpc("ssi_search", { q, max_rows: maxRows })).then(
        (res) => {
          if (id !== requestSeq.current) return; // stale — a newer query won
          if (!res || res.error) {
            setRows([]);
            setStatus("error");
            return;
          }
          setRows(toFindResults(res.data));
          setActive(0);
          setStatus("ready");
        },
        () => {
          if (id !== requestSeq.current) return;
          setRows([]);
          setStatus("error");
        },
      );
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [open, query, maxRows, debounceMs]);

  // Reset the transient state when the palette closes (keep the last query so
  // reopening shows what you searched for; it is selected on focus).
  React.useEffect(() => {
    if (open) return;
    requestSeq.current++;
    setActive(0);
  }, [open]);

  const groups: FindGroup[] = React.useMemo(() => groupFindResults(rows), [rows]);

  // Flatten for keyboard traversal, remembering where each group starts.
  const { flat, groupStarts } = React.useMemo(() => {
    const list: { row: FindResult; group: number }[] = [];
    const starts: number[] = [];
    groups.forEach((group, gi) => {
      starts.push(list.length);
      group.rows.forEach((row) => list.push({ row, group: gi }));
    });
    return { flat: list, groupStarts: starts };
  }, [groups]);

  const activeIndex = flat.length === 0 ? -1 : Math.min(active, flat.length - 1);

  React.useEffect(() => {
    if (activeIndex < 0) return;
    rowRefs.current[activeIndex]?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  const resolvedBaseUrls = React.useMemo(
    () => ({ ...FIND_APP_BASE_URLS, ...(baseUrls ?? {}) }),
    [baseUrls],
  );

  const select = React.useCallback(
    (row: FindResult) => {
      const destination = findDestination(row, currentApp, resolvedBaseUrls);
      setOpen(false);
      if (onSelect?.(row, destination) === false) return;
      if (!destination.external && onNavigate) {
        onNavigate(destination.href);
        return;
      }
      if (typeof window !== "undefined") window.location.assign(destination.href);
    },
    [currentApp, resolvedBaseUrls, setOpen, onSelect, onNavigate],
  );

  function onPanelKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key === "Tab") {
      // Focus trap + group cycling: Tab never leaves the palette, it moves to
      // the first row of the next app group (Shift+Tab → previous).
      e.preventDefault();
      if (groups.length === 0) return;
      const current = activeIndex >= 0 ? flat[activeIndex].group : 0;
      const next = e.shiftKey
        ? (current - 1 + groups.length) % groups.length
        : (current + 1) % groups.length;
      setActive(groupStarts[next]);
      return;
    }
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (Math.min(a, flat.length - 1) + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (Math.min(a, flat.length - 1) - 1 + flat.length) % flat.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(flat.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) select(flat[activeIndex].row);
    }
  }

  const trimmed = query.trim();
  const announcement = React.useMemo(() => {
    if (status === "loading") return "Searching…";
    if (status === "error") return `${ERROR_TITLE}.`;
    if (status !== "ready") return "";
    if (flat.length === 0) return `No matches for ${trimmed}`;
    const rowWord = flat.length === 1 ? "result" : "results";
    const appWord = groups.length === 1 ? "app" : "apps";
    return `${flat.length} ${rowWord} in ${groups.length} ${appWord}`;
  }, [status, flat.length, groups.length, trimmed]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      // Overlay tint copied verbatim from Modal/Drawer so every SSI overlay
      // sits on the same scrim. z-[70] keeps Find above modals (z-50) and
      // toasts (z-[60]) — it is the top-level "get me out of here" surface.
      className="fixed inset-0 z-[70] flex animate-fade-in items-stretch justify-center bg-[rgba(20,30,60,0.28)] backdrop-blur-sm sm:items-start sm:p-4 sm:pt-[12vh]"
      onMouseDown={() => setOpen(false)}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="SSI Find — search the suite"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onPanelKeyDown}
        className={cn(
          // Mobile: full-screen sheet. ≥640px: floating 18px-rounded card.
          "flex h-full w-full animate-scale-in flex-col overflow-hidden border-line bg-card shadow-pop outline-none",
          "sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-card sm:border",
          className,
        )}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <IconSearch size={18} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
            aria-label="Search across the SSI suite"
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-14 w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted sm:h-12"
          />
          <kbd className="hidden shrink-0 rounded-[6px] border border-line bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-muted sm:inline-block">
            Esc
          </kbd>
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setOpen(false)}
            className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-muted transition-calm hover:bg-blue-soft hover:text-blue sm:hidden"
          >
            <IconClose size={18} />
          </button>
        </div>

        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          {status === "idle" && (
            <p className="px-6 py-12 text-center text-[13px] text-muted">
              {trimmed.length === 0
                ? "Search clients, engagements, tasks, proposals, files, invoices and more — across every SSI app."
                : `Keep typing — at least ${MIN_QUERY} characters.`}
            </p>
          )}

          {status === "loading" && <FindLoading />}

          {status === "error" && (
            <EmptyState
              compact
              icon={<IconAlert size={18} />}
              title={ERROR_TITLE}
              description={ERROR_BODY}
            />
          )}

          {status === "ready" && flat.length === 0 && (
            <EmptyState
              compact
              icon={<IconSearch size={18} />}
              title={`No matches for "${trimmed}"`}
              description="Try a different name, reference or keyword."
            />
          )}

          {status === "ready" &&
            groups.map((group, gi) => (
              <div
                key={group.app}
                role="group"
                aria-label={group.label}
                className="border-b border-line py-1.5 last:border-b-0"
              >
                <div className="flex items-center gap-2 px-4 py-1.5">
                  <Pill tone="blue" size="sm">
                    {group.label}
                  </Pill>
                  <span className="text-[11px] text-muted">{group.count}</span>
                </div>
                {group.rows.map((row, ri) => {
                  const index = groupStarts[gi] + ri;
                  const isActive = index === activeIndex;
                  return (
                    <div
                      key={`${row.app}:${row.kind}:${row.id}:${index}`}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isActive}
                      ref={(el) => {
                        rowRefs.current[index] = el;
                      }}
                      // Keep focus in the input so aria-activedescendant stays
                      // the single source of truth for "what is selected".
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => select(row)}
                      className={cn(
                        "flex min-h-[44px] w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-calm",
                        isActive ? "bg-blue-soft" : "hover:bg-blue-soft/50",
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-soft text-blue">
                        <KindIcon kind={row.kind} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">
                          {findHighlight(row.title, trimmed).map((seg, i) =>
                            seg.match ? (
                              <mark
                                key={i}
                                className="rounded-[3px] bg-gold-soft px-0.5 text-ink"
                              >
                                {seg.text}
                              </mark>
                            ) : (
                              <React.Fragment key={i}>{seg.text}</React.Fragment>
                            ),
                          )}
                        </span>
                        {row.subtitle && (
                          <span className="block truncate text-[12px] text-muted">
                            {row.subtitle}
                          </span>
                        )}
                      </span>
                      {row.kind && (
                        <span className="hidden shrink-0 text-[11px] capitalize text-muted sm:block">
                          {row.kind}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
        </div>

        <div className="hidden items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-muted sm:flex">
          <span className="flex items-center gap-1.5">
            <FindKey>↑</FindKey>
            <FindKey>↓</FindKey>
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <FindKey>↵</FindKey>
            open
          </span>
          <span className="flex items-center gap-1.5">
            <FindKey>Tab</FindKey>
            switch app
          </span>
          <span className="ml-auto font-medium">SSI Find</span>
        </div>

        <div aria-live="polite" role="status" className="sr-only">
          {announcement}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FindKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[6px] border border-line bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-muted">
      {children}
    </kbd>
  );
}

/** Shimmer placeholder shaped like two groups of results. */
function FindLoading() {
  return (
    <div className="py-1.5" role="status" aria-label="Searching">
      {[0, 1].map((g) => (
        <div key={g} className="border-b border-line py-1.5 last:border-b-0">
          <div className="px-4 py-1.5">
            <Skeleton h={20} w={96} rounded="full" />
          </div>
          {[0, 1].map((r) => (
            <div key={r} className="flex min-h-[44px] items-center gap-3 px-4 py-2.5">
              <Skeleton h={32} w={32} rounded="full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton h={12} w={r === 0 ? "58%" : "42%"} />
                <Skeleton h={10} w="30%" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── FindButton — the topbar trigger ──────────────────────────────────────────

export interface FindButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Visible label (also the accessible name when `compact`). */
  label?: string;
  /** Icon-only pill for tight topbars. */
  compact?: boolean;
}

export function FindButton({
  label = "Search",
  compact = false,
  className,
  onClick,
  ...props
}: FindButtonProps) {
  // Resolved after mount only — the platform is unknown during SSR and a
  // guessed shortcut would hydrate-mismatch.
  const [shortcut, setShortcut] = React.useState<string | null>(null);
  React.useEffect(() => {
    const ua =
      typeof navigator === "undefined"
        ? ""
        : `${navigator.platform ?? ""} ${navigator.userAgent ?? ""}`;
    setShortcut(/mac|iphone|ipad|ipod/i.test(ua) ? "⌘K" : "Ctrl K");
  }, []);

  return (
    <button
      type="button"
      aria-label={compact ? label : undefined}
      aria-keyshortcuts="Meta+K Control+K"
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) openFind();
      }}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-pill border border-line bg-card text-[13px] text-muted transition-calm",
        "hover:border-blue/30 hover:bg-blue-soft/50 hover:text-ink",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:h-9",
        compact ? "w-11 justify-center sm:w-9" : "px-3",
        className,
      )}
      {...props}
    >
      <IconSearch size={16} className="shrink-0" />
      {!compact && <span>{label}</span>}
      {!compact && shortcut && (
        <kbd className="ml-1 hidden rounded-[6px] border border-line bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-muted sm:inline-block">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
