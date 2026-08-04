// ── SSI Find — cross-suite search helpers (server-safe, no JSX) ──────────────
// Pure routing / grouping / highlighting logic behind <FindPalette />. Kept in
// its own module (like status.ts) so server components and tests can import it
// without pulling in the client bundle.
//
// The data comes from the live Postgres RPC `public.ssi_search(q, max_rows)` in
// the shared Supabase project. The RPC does tenant + staff filtering server-side
// and refuses anon callers, so this layer treats every returned field as
// UNTRUSTED DISPLAY DATA: paths are validated before they are turned into hrefs
// and rows are shape-checked before they reach React.

/** The seven suites the RPC can return rows from. */
export type FindApp =
  | "e-mteja"
  | "e-office"
  | "e-proposals"
  | "sahara-cloud"
  | "e-learning"
  | "e-accounts"
  | "brand-hub";

/** Row kinds the RPC emits today (new kinds degrade to a generic icon). */
export type FindKind =
  | "client"
  | "contact"
  | "engagement"
  | "task"
  | "proposal"
  | "file"
  | "course"
  | "finance client"
  | "invoice"
  | "receipt"
  | "tender"
  | "team member"
  | "brand document";

/** One row of `public.ssi_search`. */
export interface FindResult {
  kind: string;
  app: string;
  id: string;
  title: string;
  subtitle: string | null;
  /** App-RELATIVE path, e.g. "/app/engagements/<id>". */
  path: string;
  at: string | null;
}

/**
 * app → production origin. Exported as ONE constant so an app can override any
 * entry (preview deploys, custom domains) via <FindPalette baseUrls={…} />.
 */
export const FIND_APP_BASE_URLS: Record<FindApp, string> = {
  "e-mteja": "https://ssi-emteja.vercel.app",
  "e-office": "https://ssi-eoffice.vercel.app",
  "e-proposals": "https://ssi-eproposals.vercel.app",
  "sahara-cloud": "https://sahara-cloud.vercel.app",
  "e-learning": "https://ssi-learn360.vercel.app",
  "e-accounts": "https://ssi-accounting.vercel.app",
  "brand-hub": "https://cards.subsaharacloud.com",
};

/** Human labels for the group headers. */
export const FIND_APP_LABELS: Record<FindApp, string> = {
  "e-mteja": "E-mteja",
  "e-office": "E-office",
  "e-proposals": "E-proposals",
  "sahara-cloud": "Sahara Cloud",
  "e-learning": "Learn360",
  "e-accounts": "E-accounts",
  "brand-hub": "Brand Hub",
};

/**
 * Label for a group header. An app the palette has not been taught yet still
 * gets a readable heading in the suite's own style ("e-future" → "E-future")
 * rather than being dropped from the results.
 */
export function findAppLabel(app: string): string {
  const known = FIND_APP_LABELS[app as FindApp];
  if (known) return known;
  if (!app) return "Other";
  return app.charAt(0).toUpperCase() + app.slice(1);
}

/**
 * Validate a path coming back from the database before it becomes an href.
 * Only same-origin absolute paths are allowed: anything that could re-target the
 * navigation ("//evil.example", "https://…", "javascript:…") collapses to "/".
 */
export function safeFindPath(path: unknown): string {
  if (typeof path !== "string") return "/";
  const p = path.trim();
  if (!p.startsWith("/")) return "/";
  // "//host" is protocol-relative; "/\" is treated as "//" by some browsers.
  if (p.startsWith("//") || p.startsWith("/\\")) return "/";
  return p;
}

export interface FindDestination {
  href: string;
  /** true ⇒ a different app: needs a full page load, not the in-app router. */
  external: boolean;
}

/**
 * Build the destination for a row. Rows belonging to `currentApp` stay relative
 * so the app's own router can handle them (no full page load); everything else
 * is joined onto that app's base URL.
 */
export function findDestination(
  result: Pick<FindResult, "app" | "path">,
  currentApp?: string,
  baseUrls: Record<string, string> = FIND_APP_BASE_URLS,
): FindDestination {
  const path = safeFindPath(result.path);
  if (currentApp && result.app === currentApp) return { href: path, external: false };
  const base = baseUrls[result.app] ?? FIND_APP_BASE_URLS[result.app as FindApp];
  // Unknown app (new suite the palette hasn't been taught yet): stay in-app
  // rather than navigating to a guessed origin.
  if (!base) return { href: path, external: false };
  return { href: base.replace(/\/+$/, "") + path, external: true };
}

export interface FindGroup {
  app: string;
  label: string;
  count: number;
  rows: FindResult[];
}

/**
 * Group rows by app, preserving the RPC's relevance order for both the groups
 * (first-seen wins) and the rows inside each group.
 */
export function groupFindResults(rows: FindResult[]): FindGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, FindResult[]>();
  for (const row of rows) {
    const key = row.app || "other";
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
      order.push(key);
    }
    bucket.push(row);
  }
  return order.map((app) => {
    const groupRows = buckets.get(app)!;
    return { app, label: findAppLabel(app), count: groupRows.length, rows: groupRows };
  });
}

export interface FindHighlightSegment {
  text: string;
  match: boolean;
}

/**
 * Split `text` into matched / unmatched segments for the query. Every
 * whitespace-separated token is matched case-insensitively and overlapping hits
 * are merged, so "acme ltd" highlights both words in "Acme Ltd Tanzania".
 * Returns a single unmatched segment when nothing matches.
 */
export function findHighlight(text: string, query: string): FindHighlightSegment[] {
  const src = typeof text === "string" ? text : "";
  const tokens = String(query ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  if (!src || tokens.length === 0) return [{ text: src, match: false }];

  const hay = src.toLowerCase();
  const spans: [number, number][] = [];
  for (const token of tokens) {
    let from = 0;
    for (;;) {
      const at = hay.indexOf(token, from);
      if (at === -1) break;
      spans.push([at, at + token.length]);
      from = at + token.length;
    }
  }
  if (spans.length === 0) return [{ text: src, match: false }];

  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([span[0], span[1]]);
  }

  const out: FindHighlightSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) out.push({ text: src.slice(cursor, start), match: false });
    out.push({ text: src.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < src.length) out.push({ text: src.slice(cursor), match: false });
  return out;
}

/**
 * Shape-check the RPC payload. Anything that isn't a usable row is dropped
 * rather than rendered — a malformed row must never blank the palette.
 */
export function toFindResults(data: unknown): FindResult[] {
  if (!Array.isArray(data)) return [];
  const out: FindResult[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    if (typeof row.title !== "string" || row.title.length === 0) continue;
    if (typeof row.app !== "string" || row.app.length === 0) continue;
    out.push({
      kind: typeof row.kind === "string" ? row.kind : "",
      app: row.app,
      id: typeof row.id === "string" ? row.id : String(row.id ?? ""),
      title: row.title,
      subtitle: typeof row.subtitle === "string" ? row.subtitle : null,
      path: safeFindPath(row.path),
      at: typeof row.at === "string" ? row.at : null,
    });
  }
  return out;
}
