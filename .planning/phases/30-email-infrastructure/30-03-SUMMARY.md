---
phase: 30-email-infrastructure
plan: "03"
subsystem: api-routes
tags: [email, resend, r2, presigned-urls, drizzle, supabase-admin]
dependency_graph:
  requires:
    - 30-01  # resend.ts singleton + Resend SDK
    - 30-02  # SongReadyEmail + GiftDeliveryEmail templates
  provides:
    - POST /api/send-creator-email
    - POST /api/send-recipient-email
  affects:
    - Phase 31 (Success Page + Dashboard UI) — will call both routes on song completion
tech_stack:
  added: []
  patterns:
    - Drizzle db (postgres role) for song lookup — bypasses RLS
    - Supabase admin client (service role key) for auth.users email lookup
    - getAudioPresignedUrl with 86400s (creator) and 604800s (recipient) expiry
    - vi.hoisted() for Vitest mock variables per Phase 29 decision
key_files:
  created:
    - src/app/api/send-creator-email/route.ts
    - src/app/api/send-creator-email/route.test.ts
    - src/app/api/send-recipient-email/route.ts
    - src/app/api/send-recipient-email/route.test.ts
  modified: []
decisions:
  - Anonymous songs use "Someone" as creatorFirstName in GiftDeliveryEmail — no Supabase admin lookup needed
  - First name extracted from user_metadata.full_name (split on space), falling back to email prefix
  - Test assertion for `react` prop uses key existence check (`'react' in callArgs`) since mocked SongReadyEmail/GiftDeliveryEmail return null
metrics:
  duration: "9 minutes"
  completed_date: "2026-03-08"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
  tests_added: 26
---

# Phase 30 Plan 03: Email Route Handlers Summary

**One-liner:** Two POST route handlers that query songs, presign R2 URLs (86400s creator / 604800s recipient), and send branded emails via Resend with full TDD coverage.

## What Was Built

### POST /api/send-creator-email

Sends a `SongReadyEmail` to the authenticated user who created a song.

**Flow:**
1. Validates `songId` in request body — returns 400 if missing
2. Queries song via Drizzle `db` (postgres role, bypasses RLS) — returns 404 if not found
3. Returns 400 if `song.userId` is null (anonymous songs have no creator email)
4. Returns 400 if `song.r2Mp3Key` is null (song not finalized)
5. Looks up creator email via Supabase admin client (`auth.admin.getUserById`)
6. Generates two presigned URLs via `getAudioPresignedUrl`:
   - `listenUrl`: 86400s expiry (24 hours)
   - `downloadUrl`: 86400s expiry + `Content-Disposition` filename for browser download prompt
7. Sends `SongReadyEmail` via Resend from `hello@notevra.com`
8. Returns `{ id: resendEmailId }` on success

### POST /api/send-recipient-email

Sends a `GiftDeliveryEmail` to the gift recipient's email address.

**Flow:**
1. Validates `songId` and `recipientEmail` in request body — returns 400 if either missing
2. Queries song via Drizzle `db` — returns 404 if not found
3. Returns 400 if `song.r2Mp3Key` is null (song not finalized)
4. Extracts creator context:
   - If authenticated (`userId` non-null): looks up via Supabase admin, extracts first name from `user_metadata.full_name` or email prefix
   - If anonymous: uses `"Someone"` as `creatorFirstName` (no admin lookup)
5. Extracts `message` from `quizData.message` with empty string fallback
6. Generates `listenUrl` with 604800s expiry (7-day R2 maximum — hard cap)
7. Sends `GiftDeliveryEmail` via Resend to `recipientEmail`
8. Returns `{ id: resendEmailId }` on success

## Decisions Made

| Decision | Rationale |
|---|---|
| Anonymous songs use "Someone" as creatorFirstName | No user to look up; avoids 500 error on admin lookup |
| First name from `user_metadata.full_name` split on space | Standard approach; falls back to email prefix if no metadata |
| Test `react` prop via key existence check | Mocked email components return null; `expect.anything()` excludes null |
| 604800s is R2 hard cap for presigned URLs | Plan spec explicitly states this; no longer expiry possible |

## Test Coverage

| Route | Tests | Coverage |
|---|---|---|
| send-creator-email | 12 tests | Missing body, 404, null userId, null r2Mp3Key, Resend error, email send args, presigned URL expiry, user lookup |
| send-recipient-email | 14 tests | Missing body fields, 404, null r2Mp3Key, Resend error, 604800s expiry, anonymous fallback, first name extraction, message fallback |

**Total: 26 tests, all passing.**

## Deviations from Plan

**None** — plan executed exactly as written. The test for `react` prop assertion used key existence instead of `expect.anything()` due to how Vitest mock functions return null, but this is a test implementation detail, not a deviation from the spec.

## Self-Check

Files created:
- `src/app/api/send-creator-email/route.ts` — POST handler (91 lines)
- `src/app/api/send-creator-email/route.test.ts` — 12 tests
- `src/app/api/send-recipient-email/route.ts` — POST handler (107 lines)
- `src/app/api/send-recipient-email/route.test.ts` — 14 tests

Commits:
- `aed94a2` — test(30-03): add failing tests for send-creator-email route
- `947c412` — feat(30-03): implement send-creator-email POST route handler
- `f3c45cd` — test(30-03): add failing tests for send-recipient-email route
- `a5dfb5b` — feat(30-03): implement send-recipient-email POST route handler

## Self-Check: PASSED

All 4 files exist on disk. All 4 commits verified in git log. Both route exports verified. 26 tests pass.
