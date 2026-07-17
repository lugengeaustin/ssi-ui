"use client";

import * as React from "react";
import { cn } from "./cn";

// ── Calm Studio theme engine (Wave 1) ─────────────────────────────────────────
// Every app's globals.css already defines the light values on :root and a full
// [data-theme="dark"] override block — this module is the ACTIVATION machinery:
// it decides which theme applies, applies it before/at paint, follows the OS in
// "system" mode, persists the user's choice, and (optionally) overlays a
// guardrailed per-tenant accent. No CSS ships from here; values live in the app.
//
// Persistence contract:
//   • localStorage("ssi-theme") — device cache, read pre-paint by
//     THEME_INIT_SCRIPT so there is never a light flash.
//   • onModeChange(mode) — the app wires this to
//     supabase.auth.updateUser({ data: { theme } }) so the choice follows the
//     user across all 8 apps + devices (shared auth project, no migration).
//   • userTheme — the value read back from user_metadata; adopted once on mount
//     when it differs from the device cache (new device / cleared storage).

import { THEME_STORAGE_KEY } from "./themeScript";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = THEME_STORAGE_KEY;
const MODES: ThemeMode[] = ["light", "dark", "system"];

function isMode(v: unknown): v is ThemeMode {
  return v === "light" || v === "dark" || v === "system";
}

function systemResolved(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? systemResolved() : mode;
}

// ── Tenant accent (guardrailed white-labelling) ───────────────────────────────
// One brand colour per tenant may override --blue / --blue-deep / --ring /
// --blue-soft. Calm Studio neutrals and layout stay fixed, and the accent is
// auto-darkened until white button text meets WCAG AA (4.5:1) so a tenant can
// never make the UI illegible.

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio of white text over the given colour. */
function contrastVsWhite(rgb: [number, number, number]): number {
  return 1.05 / (luminance(rgb) + 0.05);
}

const toHex = (rgb: [number, number, number]) =>
  "#" + rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");

export interface AccentPalette {
  blue: string;
  blueDeep: string;
  ring: string;
  soft: string;
}

/**
 * Validate + guardrail a tenant accent. Returns null for anything that isn't a
 * 6-digit hex. Darkens the accent until white text on it reaches AA (4.5:1),
 * then derives the deep/ring/soft companions the Calm Studio tokens expect.
 */
export function accentPalette(hex: string | null | undefined): AccentPalette | null {
  if (!hex) return null;
  let rgb = hexToRgb(hex);
  if (!rgb) return null;
  // AA guard: darken multiplicatively until white-on-accent ≥ 4.5:1.
  let guard = 0;
  while (contrastVsWhite(rgb) < 4.5 && guard < 24) {
    rgb = [rgb[0] * 0.88, rgb[1] * 0.88, rgb[2] * 0.88];
    guard++;
  }
  const blue = toHex(rgb);
  const deep = toHex([rgb[0] * 0.72, rgb[1] * 0.72, rgb[2] * 0.72]);
  const [r, g, b] = rgb.map(Math.round);
  return {
    blue,
    blueDeep: deep,
    ring: `rgba(${r}, ${g}, ${b}, 0.45)`,
    soft: `rgba(${r}, ${g}, ${b}, 0.08)`,
  };
}

const ACCENT_VARS: Record<keyof AccentPalette, string> = {
  blue: "--blue",
  blueDeep: "--blue-deep",
  ring: "--ring",
  soft: "--blue-soft",
};

// ── Provider ──────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Called whenever the USER changes the mode — wire to user_metadata. */
  onModeChange?: (mode: ThemeMode) => void | Promise<void>;
  /** Tenant accent hex (null/undefined ⇒ SSI palette untouched). */
  accent?: string | null;
  /** Cross-device preference from user_metadata; adopted once on mount. */
  userTheme?: string | null;
}

export function ThemeProvider({
  children,
  onModeChange,
  accent,
  userTheme,
}: ThemeProviderProps) {
  const [mode, setModeState] = React.useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return isMode(stored) ? stored : "system";
    } catch {
      return "system";
    }
  });
  const [resolved, setResolved] = React.useState<ResolvedTheme>(() => resolve(mode));

  // Apply + track. In system mode, follow OS changes live.
  React.useEffect(() => {
    const apply = () => {
      const r = resolve(mode);
      setResolved(r);
      document.documentElement.dataset.theme = r;
    };
    apply();
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [mode]);

  // Adopt the cross-device preference exactly once (new device / cleared cache).
  const adopted = React.useRef(false);
  React.useEffect(() => {
    if (adopted.current || !isMode(userTheme)) return;
    adopted.current = true;
    let cached: string | null = null;
    try {
      cached = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    // Only adopt when the device has no explicit choice of its own.
    if (!isMode(cached) && userTheme !== "system") {
      setModeState(userTheme);
      try {
        window.localStorage.setItem(STORAGE_KEY, userTheme);
      } catch {
        /* best-effort */
      }
    }
  }, [userTheme]);

  // Guardrailed tenant accent — inline vars on <html> so they beat :root.
  React.useEffect(() => {
    const root = document.documentElement;
    const palette = accentPalette(accent);
    (Object.keys(ACCENT_VARS) as (keyof AccentPalette)[]).forEach((k) => {
      if (palette) root.style.setProperty(ACCENT_VARS[k], palette[k]);
      else root.style.removeProperty(ACCENT_VARS[k]);
    });
  }, [accent]);

  const setMode = React.useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* best-effort */
      }
      void onModeChange?.(next);
    },
    [onModeChange],
  );

  const value = React.useMemo(
    () => ({ mode, resolved, setMode }),
    [mode, resolved, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>.");
  }
  return ctx;
}

// ── ThemeToggle — 3-state segmented control for user menus ───────────────────

const MODE_META: Record<ThemeMode, { label: string; icon: React.ReactNode }> = {
  light: {
    label: "Light",
    icon: (
      <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M15.8 4.2l-1.4 1.4M5.6 14.4l-1.4 1.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  dark: {
    label: "Dark",
    icon: (
      <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden>
        <path
          d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  system: {
    label: "Auto",
    icon: (
      <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden>
        <rect x="2.5" y="4" width="15" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7 17h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
};

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-pill border border-line bg-canvas p-0.5",
        className,
      )}
    >
      {MODES.map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            title={MODE_META[m].label}
            onClick={() => setMode(m)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] font-medium transition-calm",
              active
                ? "bg-card text-blue shadow-card"
                : "text-muted hover:text-ink",
            )}
          >
            {MODE_META[m].icon}
            {MODE_META[m].label}
          </button>
        );
      })}
    </div>
  );
}
