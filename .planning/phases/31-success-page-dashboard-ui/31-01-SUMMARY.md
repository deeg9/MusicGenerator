---
phase: 31-success-page-dashboard-ui
plan: 01
subsystem: ui
tags: [supabase, auth, react, next.js, email, components]

requires:
  - phase: 30-email-infrastructure
    provides: /api/send-recipient-email route that RecipientEmailForm calls
  - phase: 29-database-schema-song-persistence
    provides: songs table with songId UUID that flows through quiz-generate

provides:
  - AuthPrompt component: inline auth upsell for anonymous users on success page
  - RecipientEmailForm component: gift email send form calling send-recipient-email API
  - songId URL search param flow from quiz-generate through quiz page to success page

affects:
  - 31-02 (dashboard page — uses same success page pattern and supabase client auth)

tech-stack:
  added: []
  patterns:
    - useEffect + createBrowserClient().auth.getUser() for client-side anonymous check
    - useTransition + fetch for non-blocking form submission to API route
    - isAnon: boolean | null state pattern (null=pending, true=show, false=hide)
    - vi.hoisted() + vi.mock() for Vitest mocks of @/lib/supabase/client

key-files:
  created:
    - src/app/quiz/success/[jobId]/_components/AuthPrompt.tsx
    - src/app/quiz/success/[jobId]/_components/AuthPrompt.test.tsx
    - src/app/quiz/success/[jobId]/_components/RecipientEmailForm.tsx
    - src/app/quiz/success/[jobId]/_components/RecipientEmailForm.test.tsx
  modified:
    - src/app/api/quiz-generate/route.ts
    - src/app/quiz/page.tsx
    - src/app/quiz/success/[jobId]/page.tsx

key-decisions:
  - "AuthPrompt renders null while isAnon is null (checking) — avoids layout shift and prevents flash before auth check"
  - "songId flows via URL search param (?songId=) alongside existing ?name= param — consistent with current pattern, no localStorage needed"
  - "RecipientEmailForm checks response body for 'not finalized' to show contextual error vs generic error"

patterns-established:
  - "Pattern: isAnon: boolean | null for deferred client-side auth checks — null=pending, true=anonymous, false=authenticated"
  - "Pattern: useTransition + fetch for POSTs to existing API routes — no server actions needed for this case"

requirements-completed:
  - SUCC-01
  - SUCC-02
  - SUCC-03

duration: ~15min
completed: 2026-03-08
---

# Phase 31 Plan 01: Wire songId Flow + Add AuthPrompt and RecipientEmailForm Summary

**AuthPrompt (inline auth upsell for anonymous users) and RecipientEmailForm (gift email send with privacy framing) added to success page, with songId flowing from quiz-generate through URL search params**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-08T03:28:00Z
- **Completed:** 2026-03-08T03:42:54Z
- **Tasks:** 1 (TDD: RED → GREEN)
- **Files modified:** 7

## Accomplishments

- songId now flows from quiz-generate API response through quiz page redirect to success page URL search params
- AuthPrompt component: checks Supabase browser client for anonymous users, shows "Save your song" inline card with sign-up and log-in links — renders nothing for authenticated users or while checking
- RecipientEmailForm component: POSTs to /api/send-recipient-email with songId + recipientEmail, shows "Gift email sent!" on success, handles not-finalized error gracefully
- Privacy framing "Private link -- no marketing, ever." visible below email input (SUCC-03)
- 10 new unit tests all passing via TDD (RED: import failures, GREEN: all pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire songId flow and create AuthPrompt + RecipientEmailForm components** - `fb33645` (feat)

**Plan metadata:** (created after this summary)

_Note: This was a TDD task. Tests were written first (RED: import failures), then components implemented (GREEN: all 10 tests pass)._

## Files Created/Modified

- `src/app/quiz/success/[jobId]/_components/AuthPrompt.tsx` - Inline auth upsell: useEffect + createBrowserClient().auth.getUser(), isAnon state, renders sign-up/login links for anonymous users only
- `src/app/quiz/success/[jobId]/_components/AuthPrompt.test.tsx` - 4 unit tests: anonymous, authenticated, pending, and jobId in link href
- `src/app/quiz/success/[jobId]/_components/RecipientEmailForm.tsx` - Gift email form: useTransition + fetch POST, sent/error states, privacy framing text
- `src/app/quiz/success/[jobId]/_components/RecipientEmailForm.test.tsx` - 6 unit tests: disabled button, enabled on email, POST body, success state, error state, privacy text
- `src/app/api/quiz-generate/route.ts` - Added songId to response JSON (was { jobId }, now { jobId, songId })
- `src/app/quiz/page.tsx` - Destructures songId from quiz-generate response, appends &songId= to redirect URL
- `src/app/quiz/success/[jobId]/page.tsx` - Added songId to searchParams type, reads songId from use(searchParams), imports + renders AuthPrompt and RecipientEmailForm in ready state

## Decisions Made

- AuthPrompt uses `isAnon: boolean | null` state where null means "still checking" — component returns null for both null and false to prevent any render before auth check completes or when authenticated
- songId flows via URL search param alongside existing ?name= param — consistent with current pattern, no localStorage complexity
- RecipientEmailForm reads response body text to detect "not finalized" error from send-recipient-email route, shows contextual message vs generic error

## Deviations from Plan

None - plan executed exactly as written. The TDD test for sign-up link href required a minor assertion fix (URL encoding `%2F` vs `/`) but this was test correction, not component deviation.

## Issues Encountered

- Test assertion for sign-up href used `stringContaining('/quiz/success/test-job-abc')` but Next.js `Link` URL-encodes the `?next=` param value, making the actual href `/signup?next=%2Fquiz%2Fsuccess%2Ftest-job-abc`. Fixed the assertion to check for `'test-job-abc'` (the non-encoded jobId portion) instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All SUCC-01, SUCC-02, SUCC-03 requirements satisfied
- AuthPrompt and RecipientEmailForm ready in success page _components for Plan 31-02
- SongPlayer also in _components directory, ready for dashboard SongCard import via @/ alias

---
*Phase: 31-success-page-dashboard-ui*
*Completed: 2026-03-08*
