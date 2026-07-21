# Ecosystem Ops & Cross-App Integration — Design Spec

**Date:** 2026-07-21
**Status:** Approved (brainstorm) → pending writing-plans
**Scope:** 5 independent workstreams across e-mteja, e-accounts, e-proposals, DataViz, and platform docs.

## Summary

Five loosely-coupled workstreams, built in this sequence (each ships independently):

1. **e-mteja** — edit/delete for contact people on the org detail page (quick win).
2. **e-accounts** — "My Expenses" self-service: retire advances + out-of-pocket claims → accountant review queue.
3. **Cross-app** — signing a facilitator contract in e-proposals mints a tokenized guest link to retire expenses in e-accounts (depends on #2).
4. **DataViz** — connect the board to live sources + prominent refresh + "data as of" freshness stamps (no auto-poll).
5. **Docs** — ecosystem business-process SOP + role-wise guidelines (Markdown+docx in brand repo AND surfaced in-platform).

Dependency: **#3 requires #2**. **#5 is authored last** so it documents the finished flows. #1 and #4 are independent.

Architectural anchors reused from prior work:
- **Cross-project relay pattern** (from HCS report register): e-accounts is a *separate* Supabase project (`eatygefbexdxrqmstkeu`); the shared platform project is `hmiewhvemxrzhlkmhfpp`. Cross-project writes go through a **secret-gated SECURITY DEFINER RPC**, never direct client writes.
- **Tokenized guest flow** (from `/sign/[token]` + `/verify`): scoped, no-login, one-purpose public pages.
- **ActionResult + withAudit** server-action conventions; RLS on every table; receipts to Supabase Storage.

---

## Workstream 1 — e-mteja: edit contact people

### Problem
`src/app/app/clients/[id]/client-detail-view.tsx` lists an org's contact people with an **AddContactModal** but no edit/delete. The `updateContact` server action already exists (`src/lib/actions/contacts.ts:106`) and is proven in the standalone `contacts-view.tsx`.

### Design
- Generalize `AddContactModal.tsx` → `ContactModal.tsx` with `mode: "add" | "edit"` and an optional `contact` prop.
  - `add` → `createContactForm` (unchanged behavior, `organization_id` fixed to current org).
  - `edit` → prefills all fields from `contact`, submits `updateContactForm`.
- In `client-detail-view.tsx`, each contact row gains **Edit** and **Delete** controls.
  - Edit opens `ContactModal` in edit mode.
  - Delete calls the existing delete action (or add `deleteContact` if absent) behind a confirm dialog.
- No schema change. Reuses existing actions, audit, i18n strings (add `editContactTitle`, `editContactCta`, `deleteContactConfirm`).

### Acceptance
- On an org detail page, a user can edit an existing contact's fields and see them persist.
- A user can delete a contact (with confirm); it disappears and is audit-logged.
- Standalone contacts view behavior is unchanged.

---

## Workstream 2 — e-accounts: "My Expenses" self-service

### Problem
Retirement exists but is accountant-only back-office (`src/pages/Imprests.tsx` → `RetireModal`). Officers/facilitators cannot submit their own expenses; there is no out-of-pocket claim concept.

### Design
A new **My Expenses** surface (`src/pages/MyExpenses.tsx`, nav entry) with two submission types into one **accountant review queue**:

**(a) Retire an advance** — reuses existing imprest retirement logic:
- Officer selects one of *their* `Issued` imprests, adds expense lines (description, category/account, receipt no, **receipt photo**, amount), sees running balance vs `amount_issued`.
- Submits as a retirement in **`pending_review`** state (does NOT post the journal yet).

**(b) Out-of-pocket claim** — new tables in the e-accounts project:
- `expense_claims` (id, claimant_id, claimant_name, project_id, engagement_ref, currency, fx_rate, total, status[`pending_review`|`approved`|`rejected`|`posted`], created_at, source[`self`|`guest`], submitted_by).
- `expense_claim_lines` (id, claim_id, description, account_code/category, receipt_no, receipt_path, amount).

**Receipts** → Supabase Storage bucket in the e-accounts project (`expense-receipts`), RLS-scoped; store path on the line.

**Accountant Review queue** (`src/pages/ExpenseReview.tsx` or a tab on Imprests):
- Lists pending retirements + claims.
- Accountant reviews line items + receipts, then **Approve → post journal**:
  - Advance retirement: `Dr <expense accounts> / Cr 1300 Staff Imprest/Advances`; set imprest `status=Retired`, `retire_date`, `retire_journal_id`.
  - Claim: `Dr <expense accounts> / Cr <payable-to-claimant / cash>`; set claim `status=posted`.
- Reject → back to submitter with a reason.

**Invariant:** nothing hits the ledger without accountant approval. Officers/facilitators submit; accountants post.

### Acceptance
- An officer can self-submit a retirement against their own issued imprest with receipt photos; it appears in the accountant queue as `pending_review` and posts nothing until approved.
- An officer can submit an out-of-pocket claim with lines + receipts; same queue.
- Accountant approve posts the correct journal and flips status; reject returns it with a reason.
- RLS: an officer sees only their own submissions; accountants see all.

---

## Workstream 3 — Cross-app: sign contract → retire expenses

### Trigger
Fires only when the signed e-proposals document is a **facilitator/staff engagement contract** (gated on document type/template flag) AND the signer resolves to an officer/claimant identity. Client sales proposals do NOT trigger it.

### Flow
1. On signature completion (`src/app/sign/[token]/` path in e-proposals), the server calls a **secret-gated relay** into the **e-accounts** project (mirrors the HCS-register relay): an RPC `create_expense_guest_submission(secret, person, engagement_ref, ...)` that inserts a `pending_expense_submission` row scoped to that person + engagement and returns a **guest token**.
2. e-proposals' post-sign receipt screen (`SignView.tsx`) renders: *"Contract signed ✓ — Retire your expenses for this engagement →"* linking to `https://ssi-accounting.vercel.app/retire/<token>`.
3. **e-accounts guest page** (`/retire/[token]` — public route in the Vite SPA):
   - Resolves the token via an e-accounts RPC (`resolve_expense_token`) — returns person + engagement context, or an expired/used state.
   - Renders the **same expense-lines form** as Workstream 2 (advance retirement if an advance exists for the engagement, else out-of-pocket claim).
   - Submits via a definer RPC that writes `expense_claim(_lines)` with `source='guest'` into the accountant queue; marks the token used.
   - Guest never sees the rest of e-accounts.

### Security
- Token: single-use, expiring, unguessable; validated only inside the e-accounts project.
- Relay secret held in e-proposals server env + e-accounts private table (never client-exposed) — HCS-register pattern.
- No service-role keys in client code.

### Acceptance
- Signing a facilitator contract surfaces the retire-expenses link on the receipt screen; signing a client proposal does not.
- The guest link opens a scoped, no-login submission form; submission appears in the accountant queue tagged `guest`.
- An expired/used token shows a safe "link no longer valid" state and discloses nothing.

---

## Workstream 4 — DataViz: connect live + refresh

### Problem
The board is not reflecting live source data (reading seed/introspection cache rather than the live analytics matviews/tables). "Realtime" here = **honest live-on-demand**, not continuous push (matviews cannot emit Postgres realtime anyway).

### Design
- **Audit + fix the tile data path** so each tile actually queries its live source at load; remove any stale seed fallback masking live data.
- **Refresh control** — prominent per-board (and optional per-tile) refresh that re-runs queries.
- **"Data as of" stamp** — each tile shows last-run time; for matview-backed tiles, also surface the matview's last `REFRESH` time (query `pg_stat` / a small `analytics.refresh_log` if present, else the cron's last success) so the board is honest about freshness.
- No auto-polling (explicit decision).
- Verify against the live matviews confirmed healthy in the 2026-07-18 E2E (9 matviews, refresh works).

### Acceptance
- Loading the board shows current live data (changing a source row + refresh reflects it).
- Every tile shows a last-updated stamp; matview-backed tiles show "data as of <refresh time>".
- No mock/seed values appear on the deployed board.

---

## Workstream 5 — Ecosystem SOP + role-wise guidelines

### Design
A structured SOP document with two parts:

**(a) Business-process SOPs** — the end-to-end flows that cross apps, each step showing *which app · who acts · what triggers the next*. Core process: **Client engagement lifecycle** —
lead/contact (e-mteja) → proposal & contract + e-sign (e-proposals) → **imprest + expense retirement** (e-accounts, incl. the new self-service + cross-app flow) → delivery (e-forge / Learn360) → assessment & HCS report (e-assess) → certification + public verify (CMS) → M&E reporting (DataViz) → governance/audit (e-office).
Plus supporting processes: field research capture (e-research), file/document handling (Sahara Cloud), finance month-end.

**(b) Role-wise guidelines** — for every role: **platform admin, programme manager, accountant/finance officer, facilitator, enumerator, client/participant, executive/leadership**. Each: responsibilities, what they do in which app, key dos/don'ts, and their touchpoints in the processes above.

### Homes (both)
- **Source of truth:** versioned Markdown in the brand repository `03_Internal_Operations/SOP/` + rendered to a printable `.docx` (SSI Staff Pack precedent).
- **In-platform:** surfaced as a governance/reference page set in e-office (and/or CMS) so roles can read it in-app. Sourced from the same content.

### Acceptance
- SOP covers every app in the ecosystem and the new flows from #2–#3.
- Every listed role has a guidelines section.
- Document exists as Markdown + docx in the brand repo AND is reachable in-platform.
- Serves as the acceptance reference for #1–#4.

---

## Out of scope (this engagement)
- Full facilitator accounts/SSO into e-accounts (guest-token flow avoids it).
- Continuous push realtime / websocket dashboards (explicitly deferred).
- Auto-provisioning facilitators as e-accounts users.
- Rewriting the accountant-side imprest flow (only adding self-service on top).

## Sequencing & verification
Build order: **1 → 2 → 3 → 4 → 5**. Each workstream: implement → typecheck/build green → deploy + smoke → verify acceptance. #3 verified only after #2 is live. #5 written last against the shipped flows.
