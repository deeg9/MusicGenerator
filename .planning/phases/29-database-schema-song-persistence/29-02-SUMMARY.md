---
phase: 29-database-schema-song-persistence
plan: 02
subsystem: database
tags: [drizzle-orm, supabase, r2, cloudflare, song-persistence, anonymous-session, ffmpeg]

# Dependency graph
requires:
  - phase: 29-01
    provides: songs table schema (Drizzle), buildSongR2WavKey/buildSongR2Mp3Key helpers in r2.ts

provides:
  - Song row inserted on every quiz-generate POST (user_id for auth, session_token for anonymous)
  - notevra_session HTTP-only cookie set/reused for anonymous users in quiz-generate
  - Finalization pipeline: WAV download, MP3 conversion, dual R2 upload, song row update on COMPLETED
  - Double-finalization guard via isNull(r2WavKey) SELECT
  - Audio route redirects to R2 presigned URL when song finalized, falls back to HeartBula proxy
  - Signup action claims anonymous songs by session_token after successful registration

affects: [30-email-infrastructure, 31-success-page-dashboard-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - vi.hoisted() for mock variables referenced in vi.mock() factory functions
    - Response cookie set via response.cookies.set() (not cookies() store) in Route Handlers
    - Finalization pipeline wrapped in try/catch — errors logged, poll response unaffected
    - isNull(r2WavKey) as idempotency guard for finalization

key-files:
  created:
    - src/app/api/audio/[jobId]/route.test.ts
  modified:
    - src/app/api/quiz-generate/route.ts
    - src/app/api/quiz-generate/route.test.ts
    - src/app/api/poll-job/[jobId]/route.ts
    - src/app/api/poll-job/[jobId]/route.test.ts
    - src/app/api/audio/[jobId]/route.ts
    - src/app/signup/actions.ts
    - src/app/signup/actions.test.ts

key-decisions:
  - "Use response.cookies.set() (not cookies() from next/headers) to set cookies in Route Handlers — cookies() is read-only in server context"
  - "Finalization pipeline errors are swallowed in poll-job — client always receives COMPLETED, failure logged for debugging"
  - "Presigned URL TTL for audio playback is 3600s (1 hour) — sufficient for immediate post-generation playback"
  - "Anonymous song claim in signup wraps DB update in try/catch — non-fatal, redirect still happens on claim failure"
  - "Use vi.hoisted() for all mock variables referenced inside vi.mock() factory functions to avoid TDZ initialization errors"

patterns-established:
  - "Pattern: vi.hoisted() pattern for Vitest mocks that use variables in factory functions"
  - "Pattern: R2 presigned URL redirect before HeartBula proxy — tiered audio serving"
  - "Pattern: isNull(column) guard for idempotent finalization pipelines"

requirements-completed: [SONG-02, SONG-04]

# Metrics
duration: ~45min
completed: 2026-03-07
---

# Phase 29 Plan 02: Song Persistence Pipeline Summary

**Songs table wired into quiz-generate, poll-job finalization (WAV+MP3 to R2), audio R2 redirect, and anonymous song claim on signup**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-07T04:43:11Z
- **Completed:** 2026-03-07T05:28:00Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 7

## Accomplishments

- Every quiz-generate POST now creates a songs row — authenticated users get user_id, anonymous users get session_token and notevra_session cookie
- Poll-job route triggers full finalization on COMPLETED: fetchAudioBuffer (WAV) → convertToMp3 → parallel R2 upload → song row update with r2WavKey, r2Mp3Key, status=completed
- Double-finalization guard via isNull(r2WavKey) prevents re-processing on concurrent/duplicate polls
- Audio route serves from R2 presigned URL (3600s TTL) when finalized, falls back to HeartBula proxy otherwise
- Signup action silently claims all anonymous songs by session_token after successful registration

## Task Commits

Each task was committed atomically:

1. **Task 1: Insert song row in quiz-generate + session cookie** - `556f4f2` (feat)
2. **Task 2: Finalization pipeline, R2 audio fallback, signup claim** - `84204f2` (feat)

**Plan metadata:** (docs commit follows)

_Note: Both tasks used TDD (RED → GREEN) with vi.hoisted() pattern for Vitest mock variables_

## Files Created/Modified

- `src/app/api/quiz-generate/route.ts` — Added DB insert + session cookie logic + HeartBula jobId back-fill
- `src/app/api/quiz-generate/route.test.ts` — 23 tests covering DB persistence, anonymous/auth identity, cookie behavior
- `src/app/api/poll-job/[jobId]/route.ts` — Added finalization pipeline on COMPLETED, failed update on FAILED
- `src/app/api/poll-job/[jobId]/route.test.ts` — 16 tests covering finalization, double-guard, failure resilience
- `src/app/api/audio/[jobId]/route.ts` — Added R2 presigned URL redirect before HeartBula proxy fallback
- `src/app/api/audio/[jobId]/route.test.ts` — 7 tests covering R2 redirect path and HeartBula fallback (new file)
- `src/app/signup/actions.ts` — Added anonymous song claim by session_token after successful signUp
- `src/app/signup/actions.test.ts` — 9 tests covering claim behavior (replaced it.todo() stubs)

## Decisions Made

- **response.cookies.set() not cookies() store:** Route Handler cookies must be set via `response.cookies.set()` — importing `cookies()` from `next/headers` is read-only in that context
- **Finalization errors non-fatal:** poll-job wraps finalization in try/catch — client sees COMPLETED regardless, enabling the success page to display without waiting for R2
- **Presigned URL TTL = 3600s:** 1-hour TTL adequate for immediate playback after generation; gift email links will use longer TTL in Phase 30
- **Signup claim non-fatal:** DB update failure during claim doesn't block the redirect — user is logged in regardless

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed vi.hoisted() pattern for Vitest mock variables**

- **Found during:** Task 1 (quiz-generate RED phase)
- **Issue:** Variables declared outside vi.mock() factories triggered "Cannot access before initialization" TDZ errors because vi.mock() is hoisted to top of file but variable declarations are not
- **Fix:** Moved all mock variables into vi.hoisted() calls so they're properly hoisted alongside vi.mock()
- **Files modified:** route.test.ts (quiz-generate), route.test.ts (poll-job), actions.test.ts (signup)
- **Verification:** All tests run without initialization errors
- **Committed in:** 556f4f2 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking Vitest pattern)
**Impact on plan:** Vitest hoisting fix was necessary for tests to run at all. No scope creep.

## Issues Encountered

- Pre-existing test failures in 3 landing component test files (HeroAudioCard, VideoSection, BottomCtaSection) — unrelated to this plan, logged to deferred-items.md

## User Setup Required

None - no external service configuration required. DB schema from Plan 01 is used as-is.

## Next Phase Readiness

- Song persistence pipeline fully functional end-to-end
- R2 audio serving operational when songs are finalized
- Anonymous-to-authenticated song claim ready for Phase 30 (email delivery) and Phase 31 (dashboard)
- Pre-existing landing component test failures should be addressed in a future maintenance phase

---
*Phase: 29-database-schema-song-persistence*
*Completed: 2026-03-07*
