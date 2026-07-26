# SSI Brand Hub — Design Spec

**Date:** 2026-07-26 · **Status:** Approved (user directive: "highest effort, long-term, permanent editor, DB-served cards, brand kit online, docs on landing, PDF renders in editor, strictly SSI use")

## What it is
A permanent, DB-backed **Brand Hub** app (`ssi-brandhub`, Next.js, suite pattern) replacing the static `ssi-cards` site and the disconnected studio editor. One system for daily brand operations.

## Surfaces
**Public** (served from DB, domain `cards.subsaharacloud.com`):
- `/` — landing: SSI intro, team grid, **company documents** (Company Profile 24pp, Business Portfolio 13pp, Services 8pp — view/download), brand contact.
- `/card/[slug]` — digital business card: photo/initials, role, tel/mail/WhatsApp links, **Save Contact (.vcf)**, OG meta; logs a row to `brand.card_scans` (analytics).

**Editor** (`/app`, **auth required — shared Supabase auth, no signup**; strictly SSI):
- People: CRUD + photo upload + live card preview + **print-card PDF render & download in-editor** (front/back 1050×600, jsPDF + QR — ports `build_cards.py` design).
- Documents: upload/replace versioned PDFs; toggle what shows on the landing.
- Brand kit: colors (tokens), logos, patterns, social-kit assets — stored online, downloadable daily.
- Dashboard: card-scan stats.

## Data (shared project `hmiewhvemxrzhlkmhfpp`, new `brand` schema)
- `brand.people` (slug uq, full_name, role_title, email, phone, whatsapp, linkedin, photo_path, bio, sort, active)
- `brand.documents` (key uq, title, description, file_path, version, pages, active)
- `brand.assets` (kind logo|color|pattern|social, name, value jsonb, file_path, sort)
- `brand.card_scans` (person_slug, scanned_at, user_agent, referer)
- Storage bucket `brand` (public read — photos, logos, doc PDFs).
- RLS: anon SELECT on active people/documents/assets + INSERT scans; all writes = authenticated (SSI staff).

## Migration & cutover
Seed the 5 existing people (from `build_cards.py`) + the 3 documents (from `04_Marketing_Collateral/Company_Profiles`). Move domain `cards.subsaharacloud.com` from Vercel project `ssi-cards` → `ssi-brandhub` (printed QR URLs unchanged). Old static site + studio retired after cutover; `_Masters` Python generators remain the source for *designing* new document editions.

## Phases
A: schema+bucket → scaffold → public landing + cards + seed → deploy + domain. B: editor (people CRUD, photo upload, PDF card render). C: documents + brand kit + scan dashboard.
