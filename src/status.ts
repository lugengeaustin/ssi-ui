// ── Calm Studio status → tone mapping (single source of truth) ──────────
// StatusBadge maps a domain status string to one of five Pill tones. Both the
// styleguide and COMPONENTS.md derive their tables from this map, so the API
// contract and the docs can never drift.

import type { PillTone } from "./Pill";

// Tones used for statuses:
//   green  → active / done / complete (success, terminal-good)
//   red    → blocked / closed / failed / cancelled (terminal-bad / halted)
//   blue   → doing / in_progress / active-work / open
//   gold   → live / pending / review / attention (in-flight, needs eyes)
//   muted  → todo / prospect / draft / archived (neutral / not-started)
export const STATUS_TONES: Record<string, PillTone> = {
  // green
  active: "green",
  done: "green",
  complete: "green",
  completed: "green",
  approved: "green",
  paid: "green",
  live_ok: "green",

  // red
  blocked: "red",
  closed: "red",
  failed: "red",
  cancelled: "red",
  canceled: "red",
  rejected: "red",
  overdue: "red",
  suspended: "red",

  // blue
  doing: "blue",
  in_progress: "blue",
  in_review: "blue",
  open: "blue",
  running: "blue",

  // gold
  live: "gold",
  pending: "gold",
  review: "gold",
  attention: "gold",
  warning: "gold",

  // muted
  todo: "muted",
  prospect: "muted",
  draft: "muted",
  archived: "muted",
  inactive: "muted",
  unknown: "muted",
};

// Resolve any status string (case/spacing-insensitive) to a tone.
// Unknown statuses fall back to `muted` — never throws.
export function toneForStatus(status: string | null | undefined): PillTone {
  if (!status) return "muted";
  const key = String(status).trim().toLowerCase().replace(/[\s-]+/g, "_");
  return STATUS_TONES[key] ?? "muted";
}
