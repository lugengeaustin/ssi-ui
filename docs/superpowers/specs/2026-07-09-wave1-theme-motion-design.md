# Wave 1 — Theme Engine + Motion System (`@ssi/ui` v1.1.0)

**Status:** approved (2026-07-09) · first wave of the next-gen UI programme
(foundation-first sequencing: B+E → A+D → C+F, user-selected).

## Context

All 8 Next.js apps consume Calm Studio through Tailwind colours that resolve to
CSS variables (`canvas: var(--bg)`, `ink: var(--ink)`, …), and every app's
`globals.css` **already contains** a `[data-theme="dark"]` value block and the
motion tokens (`--ease-calm`, `--dur-fast/base`). Nothing ever sets
`data-theme`, so dark mode has never been reachable. Wave 1 ships the
**activation machinery** in `@ssi/ui` and rolls it to all 8 apps with one
version bump.

## Decisions (user-confirmed)

1. **Theme switch:** 3-state (Light / Dark / System), toggle in each app's user
   menu. Persisted **cross-app + cross-device** via Supabase
   `auth.updateUser({ data: { theme } })` (user_metadata — shared auth project,
   so it follows the user through all 8 apps with zero migration), with a
   `localStorage` cache + pre-paint init script so there is no flash.
2. **Tenant accent (white-label lever):** accent colour + logo per tenant,
   guardrailed — accent drives `--blue`/`--blue-deep`/`--ring` only; Calm
   Studio neutrals/layout stay fixed; an AA contrast guard auto-darkens an
   accent that would make button text illegible. Ships with SSI default (null →
   no visual change). Additive columns `emteja.tenants.brand_accent`,
   `emteja.tenants.logo_url`. Wired in e-office as the reference; other apps
   accept the prop but pass nothing this wave.
3. **Motion system:** standardize on the existing tokens; skeletons replace
   spinners on primary list loaders (`loading.tsx` per app's main route);
   `useOptimisticAction` helper for instant-feel writes with rollback + toast;
   `prefers-reduced-motion` honoured globally.

## Components (all in `@ssi/ui`, no new dependencies)

- `ThemeProvider` (client): owns mode (`light|dark|system`), applies
  `data-theme` to `<html>`, follows OS changes in `system` mode, persists to
  `localStorage("ssi-theme")`, calls optional `onModeChange(mode)` (apps wire
  this to `supabase.auth.updateUser`). Accepts `accent?: string|null` and
  applies the guardrailed accent variables. Accepts `userTheme?: string|null`
  (from user_metadata) to adopt a cross-device preference on mount.
- `useTheme()` — `{ mode, resolved, setMode }`.
- `ThemeToggle` — 3-state control for user menus.
- `THEME_INIT_SCRIPT` — inline `<head>` script string (reads cache, resolves
  system, sets `data-theme` before paint).
- `accentPalette(hex)` — pure helper: validates hex, computes `--blue-deep`
  (darkened) and enforces ≥ 4.5:1 contrast for white text by darkening.
- `SkeletonRows` / `SkeletonCards` presets over the existing `Skeleton`.
- `useOptimisticAction` — apply optimistic state, run action, rollback on error.

## Per-app rollout (8 apps)

1. Bump `@ssi/ui` tarball to v1.1.0.
2. Root layout `<head>`: inject `THEME_INIT_SCRIPT`.
3. `AppChrome`: wrap in `ThemeProvider` (wiring `onModeChange` → supabase
   user_metadata) and add `ThemeToggle` to the user menu.
4. Append the `prefers-reduced-motion` block to `globals.css`.
5. Add `loading.tsx` (skeleton) for the main authenticated route group.
6. e-office only: fetch `brand_accent`/`logo_url` for the session tenant and
   pass `accent` to the provider.

## Out of scope (later waves / explicitly deferred)

Suite shell, cross-app ⌘K, DataTable v2 (Wave 2); copilot rail, field-mode PWA
(Wave 3); theme-builder UI; tenant control of neutrals; DataViz + Accounting
(Vite apps, not on `@ssi/ui`).

## Testing

Vitest in `@ssi/ui` for provider mode logic, init-script string, accent
guardrail math, optimistic rollback. Per-app `tsc` + production build via the
existing CI gate; visual spot-check of dark mode on the reference app before
the 7-app roll.
