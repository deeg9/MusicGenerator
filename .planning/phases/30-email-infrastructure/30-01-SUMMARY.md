---
phase: 30-email-infrastructure
plan: "01"
subsystem: email
tags: [resend, react-email, env, next-config, smtp]
dependency_graph:
  requires: []
  provides: [resend-client-singleton, RESEND_API_KEY-env-validation, react-email-packages]
  affects: [30-02, 30-03]
tech_stack:
  added: [resend@6.9.3, "@react-email/components@1.0.8", react-email@5.2.9]
  patterns: [singleton-client, zod-env-validation, serverExternalPackages]
key_files:
  created:
    - src/lib/resend.ts
  modified:
    - src/env.ts
    - next.config.ts
    - package.json
    - package-lock.json
decisions:
  - "Use process.env.RESEND_API_KEY directly in resend.ts (not getEnv()) to match Supabase client module-scope instantiation pattern"
  - "Supabase SMTP configured via dashboard (human action) — same Resend API key for both SMTP and SDK per Resend guidance"
metrics:
  duration: "~2 minutes (Task 1 automated) + human dashboard config (Task 2)"
  completed_date: "2026-03-07"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 5
---

# Phase 30 Plan 01: Resend SDK + Email Infrastructure Foundation Summary

**One-liner:** Resend SDK installed with React Email packages, client singleton created, RESEND_API_KEY in Zod env schema, next.config.ts updated, Supabase SMTP configured via Resend (smtp.resend.com:465) with verified notevra.net domain.

## What Was Built

Task 1 (automated) established the full code-side email foundation:

- **`src/lib/resend.ts`** — Resend client singleton exported as `resend`. Uses `process.env.RESEND_API_KEY` directly at module scope, matching the Supabase client pattern already established in this project. This singleton is imported by all email send routes in Plans 30-02 and 30-03.

- **`src/env.ts`** — Added `RESEND_API_KEY: z.string().min(1)` to the Zod env schema. Any missing key will throw a startup error with a clear message before the server serves requests.

- **`next.config.ts`** — Expanded `serverExternalPackages` from `['ffmpeg-static']` to `['ffmpeg-static', 'react-email', '@react-email/render']`. Prevents Turbopack from bundling these Node-only packages, avoiding the Prettier version conflict (see resend/react-email#1816).

- **`package.json`** — Added `resend`, `@react-email/components` as dependencies; `react-email` as devDependency; `"email"` script for local preview server on port 3001.

Task 2 (checkpoint:human-action) was completed by the user in external dashboards:
- notevra.net domain added to Resend with DKIM verified (DNS via Namecheap)
- Supabase custom SMTP configured: smtp.resend.com:465, username=resend
- Sender configured as: `Notevra <noreply@notevra.net>`
- RESEND_API_KEY added to `.env.local`

## Deviations from Plan

None — plan executed exactly as written.

## Auth Gates / Human Actions

**Task 2 — Supabase SMTP + Resend Domain Configuration (COMPLETED)**
- Required: Human must access Resend dashboard and Supabase dashboard
- Status: Complete — all configuration confirmed by user
- SMTP: `smtp.resend.com:465`, username=`resend`, password=Resend API key
- Sender: `Notevra <noreply@notevra.net>`
- Domain: notevra.net verified in Resend (DKIM DNS records added via Namecheap)

## Commits

| Hash | Message |
|------|---------|
| 8058d39 | feat(30-01): install Resend SDK and configure email foundation |
| 2ec1c6a | docs(30-01): complete Resend foundation plan — awaiting SMTP human-action checkpoint |

## Next Phase Readiness

- Resend SDK importable and client singleton ready for use in email route handlers
- RESEND_API_KEY validated at startup via Zod — missing key surfaces immediately
- Supabase auth emails (password reset, email confirmation) now route through Resend SMTP
- Domain notevra.net verified — emails will pass DKIM/SPF checks
- Plans 30-02 and 30-03 can proceed: email templates and route handlers can import `resend` from `src/lib/resend.ts`

## Self-Check: PASSED

- [x] `src/lib/resend.ts` exists and exports `resend` singleton
- [x] `src/env.ts` contains `RESEND_API_KEY`
- [x] `next.config.ts` contains `react-email` in serverExternalPackages
- [x] `node -e "require('resend')"` succeeds
- [x] Commit 8058d39 exists
- [x] Supabase SMTP configured (confirmed by user)
- [x] Resend domain notevra.net verified (confirmed by user)
- [x] RESEND_API_KEY added to .env.local (confirmed by user)
