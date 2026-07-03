# @ssi/ui

Sub-Sahara Institute shared React UI kit — the **Calm Studio** primitive
library extracted from the Sahara app suite (E-mteja, E-office, E-proposals,
E-research, and siblings), where it was previously duplicated in each app's
`src/components/ui/`.

The package ships **TSX source** (no build step); consuming apps compile it via
Next's `transpilePackages`. It is a sibling to
[`@ssi/brand`](https://github.com/lugengeaustin/ssi-brand) and is distributed
the same way — as a GitHub tag tarball.

## What's inside

All 21 Calm Studio primitives plus `Stepper`, the `TextLink` link primitive,
and helpers: `Button`, `Card` (+ `Panel`, `Section`, `PageHeader`), `Pill`
(+ `Badge`, `StatusBadge`), `Field` (+ `Input`, `Textarea`, `Select`,
`Checkbox`, `Switch`, `controlClass`), `DataTable`, `Modal`/`Drawer`,
`confirm`, `Toaster`/`toast`, `Tabs`, `Stepper`, `Menu`, `Tooltip`, `Avatar`,
`Pagination`, `StatCard`, `Toolbar`, `Skeleton`/`SkeletonText`, `EmptyState`,
`TextLink` (+ `linkClass`, `textLinkClass`), the inline `icons` set, `cn`, and
the `STATUS_TONES` / `toneForStatus` status helpers.

The kit is framework-agnostic: it depends only on `react`, `react-dom`, and
(peer) `lucide-react`. `TextLink` renders a styled `<a>` — apps that need
client-side prefetch can wrap their router's `Link` and apply `linkClass()` or
the `textLinkClass` string.

## How it's consumed

Add the tag tarball to each app's `package.json`:

```json
"@ssi/ui": "https://github.com/lugengeaustin/ssi-ui/archive/refs/tags/v1.0.0.tar.gz"
```

## Wiring an app

1. **Transpile the source** — `next.config.js`:

   ```js
   module.exports = { transpilePackages: ["@ssi/ui"] };
   ```

2. **Redirect the old import path** so existing `@/components/ui` imports resolve
   to the package — `tsconfig.json`:

   ```json
   { "compilerOptions": { "paths": { "@/components/ui": ["./node_modules/@ssi/ui/src/index.ts"] } } }
   ```

   (Or migrate call-sites to import `@ssi/ui` directly.)

3. **Include the source in the Tailwind content glob** so classes aren't purged —
   `tailwind.config.js`:

   ```js
   content: ["./node_modules/@ssi/ui/src/**/*.{ts,tsx}", /* app globs */]
   ```

Design tokens (colours like `text-blue`, `--ring`, `transition-calm`) come from
`@ssi/brand` — keep it installed alongside `@ssi/ui`.

## Version note

`v1.0.0` — first extraction. Pin apps to the exact tag; bump the tag and the
`package.json` tarball URLs together when releasing a new version (matching the
`@ssi/brand` release pattern).
