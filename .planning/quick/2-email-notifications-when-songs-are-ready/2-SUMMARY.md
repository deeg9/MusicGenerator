---
phase: quick-task
plan: 2
subsystem: notifications
tags: [email, poll-job, finalization, idempotency]
dependency_graph:
  requires: [send-creator-email endpoint, songs table, heartbula poll-job]
  provides: [automatic creator email on song completion]
  affects: [src/app/api/poll-job/[jobId]/route.ts, src/db/schema.ts]
tech_stack:
  added: []
  patterns: [internal fetch for email trigger, creatorEmailSentAt idempotency guard]
key_files:
  created: []
  modified:
    - src/db/schema.ts
    - src/app/api/poll-job/[jobId]/route.ts
    - src/app/api/poll-job/[jobId]/route.test.ts
decisions:
  - drizzle-kit push blocked by Supabase CHECK constraint bug (same as Phase 29-01) — migration applied via raw SQL using postgres package
  - Internal fetch to /api/send-creator-email uses request.url as base so it resolves correctly in all environments
  - creatorEmailSentAt only set after 2xx response to guarantee idempotency only on confirmed delivery
metrics:
  duration: ~15 minutes
  completed_date: "2026-03-16"
  tasks: 2
  files_changed: 3
---

# Quick Task 2: Email Notifications When Songs Are Ready — Summary

**One-liner:** Auto-sends creator "song ready" email on first COMPLETED poll-job finalization via idempotency-guarded internal fetch to the existing send-creator-email endpoint.

## What Was Built

Authenticated users now automatically receive a "song ready" email when their generation finishes, without needing to keep the browser open. The notification is wired into the existing poll-job finalization flow and is fully idempotent.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add creatorEmailSentAt column and apply migration | 2f2ab95 | src/db/schema.ts |
| 2 | Wire automatic creator email into poll-job finalization | a4d8f27 | route.ts, route.test.ts |

## Implementation Details

**Schema (Task 1):**
- Added `creatorEmailSentAt: timestamp('creator_email_sent_at', { withTimezone: true })` to `songs` table after `failedAt`
- Nullable by default — null means no email sent yet
- Applied via `ALTER TABLE songs ADD COLUMN IF NOT EXISTS creator_email_sent_at TIMESTAMPTZ` using the postgres package (drizzle-kit push fails on Supabase due to CHECK constraint introspection bug)

**Poll-job wiring (Task 2):**
- Renamed `_req` to `request` in the GET handler to make `request.url` available for internal URL construction
- After `finalizeSong()` succeeds in the COMPLETED branch, queries the song row for `id`, `userId`, and `creatorEmailSentAt`
- Guards: skips if `userId` is null (anonymous) or `creatorEmailSentAt` is already set (already notified)
- Calls `fetch(new URL('/api/send-creator-email', request.url), { method: 'POST', ... })`
- On 2xx response: sets `creatorEmailSentAt = new Date()` to prevent future duplicate sends
- Entire block wrapped in `try/catch` with `console.error('[poll-job] creator email failed (non-fatal):', error)` — email failures never affect the poll response

## Tests

Updated `route.test.ts` to match the current R2-key-from-RunPod implementation (the file referenced stale `fetchAudioBuffer`/`convertToMp3`/`uploadAudioToR2` mocks from before the serverless migration). Added 6 new email test cases:

1. Sends email when song has userId and no creatorEmailSentAt
2. Sets creatorEmailSentAt after successful email send
3. Skips email for anonymous songs (no userId)
4. Skips email when creatorEmailSentAt already set (idempotency)
5. Returns COMPLETED even when email fetch throws (non-fatal)
6. Does not set creatorEmailSentAt when endpoint returns non-2xx

**Test result:** 20/20 passing (up from 12/16 before this plan — 4 previously failing tests were stale from serverless migration).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale finalization tests referencing removed audio processing code**
- **Found during:** Task 2 (pre-existing failures)
- **Issue:** Tests called `fetchAudioBuffer`, `convertToMp3`, `uploadAudioToR2` which were removed during the RunPod serverless migration (Phases 33-34). 4 tests were failing before this plan.
- **Fix:** Rewrote test file to use fast-path + R2-key-from-RunPod pattern matching the current implementation. Added fast-path test cases that were also missing.
- **Files modified:** `src/app/api/poll-job/[jobId]/route.test.ts`
- **Commit:** a4d8f27

**2. [Rule 3 - Blocking] drizzle-kit push fails on Supabase CHECK constraint bug**
- **Found during:** Task 1
- **Issue:** `drizzle-kit push` throws `TypeError: Cannot read properties of undefined (reading 'replace')` — same Supabase CHECK constraint introspection bug as Phase 29-01.
- **Fix:** Applied `ALTER TABLE songs ADD COLUMN IF NOT EXISTS creator_email_sent_at TIMESTAMPTZ` directly using the `postgres` npm package (already a project dependency via drizzle-orm).
- **Commit:** 2f2ab95

## Self-Check: PASSED

All files created/modified, all commits verified, schema column and email wiring confirmed present.
