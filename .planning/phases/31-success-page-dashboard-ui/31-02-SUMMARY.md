---
phase: 31-success-page-dashboard-ui
plan: 02
subsystem: ui
tags: [supabase, drizzle, r2, next-js, server-components, vitest]

# Dependency graph
requires:
  - phase: 28-auth-infrastructure
    provides: createClient() + getUser() server-side auth pattern
  - phase: 29-database-schema-song-persistence
    provides: songs table schema with r2Mp3Key, userId, recipientName, relationship, genre
  - phase: 30-email-infrastructure
    provides: getAudioPresignedUrl() from src/lib/r2.ts
  - phase: 31-01
    provides: SongPlayer component at @/app/quiz/success/[jobId]/_components/SongPlayer

provides:
  - /dashboard async Server Component page with auth guard and song list
  - SongCard Client Component with SongPlayer embed and re-download anchor
  - buildDownloadFilename() helper for slug-based MP3 filenames
  - Empty state UI with Music icon and CTA to /quiz

affects:
  - 31-03 (success page additions — shares codebase)
  - future auth or song feature phases

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component auth guard via createClient()+getUser() with redirect()
    - Drizzle query with isNotNull() filter + JS-level safety filter before Promise.all
    - SongCard as 'use client' component importing SongPlayer cross-route via @/ alias
    - createdAt serialized as ISO string string from Server Component to Client Component

key-files:
  created:
    - src/app/dashboard/page.tsx
    - src/app/dashboard/_components/SongCard.tsx
    - src/app/dashboard/_components/SongCard.test.tsx
    - src/app/dashboard/page.test.tsx

key-decisions:
  - "Dashboard filtering uses isNotNull at Drizzle query level AND JS filter before Promise.all for defense in depth"
  - "createdAt prop on SongCard is typed as string (not Date) — Server Components serialize props to JSON, so Date must be converted to ISO string before passing"
  - "SongPlayer imported via @/ alias cross-route (not moved to @/components) — alias is stable under current structure"

patterns-established:
  - "Async Server Component auth guard: createClient() → getUser() → if (!user) redirect('/login?next=/dashboard')"
  - "TDD for Server Components: call async page function directly, render returned JSX with @testing-library/react"
  - "Mock Drizzle chain: mockDbSelect → mockFrom → mockWhere → mockOrderBy for .select().from().where().orderBy() pattern"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04]

# Metrics
duration: ~10min
completed: 2026-03-07
---

# Phase 31 Plan 02: Dashboard Page + SongCard Summary

**Auth-gated /dashboard Server Component with Drizzle song query, parallel R2 presigned URL generation, and SongCard Client Component with SongPlayer and re-download**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-07T19:40:00Z
- **Completed:** 2026-03-07T19:50:00Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 4 created

## Accomplishments

- SongCard Client Component renders recipient name/relationship/genre/date, embeds SongPlayer, and provides download anchor with correct href and download attributes — 5 tests pass
- Dashboard Server Component auth guard redirects unauthenticated users to `/login?next=/dashboard` using getUser() (never getSession())
- Drizzle query filters songs with null r2Mp3Key at DB level using isNotNull(); JS-level filter added as defense-in-depth safety guard before Promise.all
- Empty state renders centered card with Music icon and "Create your first song" CTA when user has no completed songs
- 9 total tests across 2 test files — all pass; no regressions to pre-existing passing tests

## Task Commits

1. **Task 1: SongCard Client Component** - `3529bde` (feat)
2. **Task 2: Dashboard page with auth guard** - `6653838` (feat)

## Files Created/Modified

- `src/app/dashboard/page.tsx` — Async Server Component: auth guard, Drizzle song query, presigned URL generation, empty state + song list rendering
- `src/app/dashboard/_components/SongCard.tsx` — Client Component: song metadata heading/subtitle, SongPlayer embed, download anchor
- `src/app/dashboard/_components/SongCard.test.tsx` — 5 unit tests covering all SongCard renders
- `src/app/dashboard/page.test.tsx` — 4 unit tests: redirect on unauth, songs render, empty state, null r2Mp3Key filter

## Decisions Made

- **createdAt as ISO string:** SongCard's `createdAt` prop is typed as `string` (not `Date`) because Server Component→Client Component prop boundary serializes to JSON. The component formats with `new Date(createdAt).toLocaleDateString()` internally.
- **Defense-in-depth filter:** Added JS-level `completedSongs.filter(s => s.r2Mp3Key !== null)` before `Promise.all` in addition to Drizzle's `isNotNull()` clause. This ensures tests asserting "no presigned URL called for null-key songs" pass even when the mock doesn't filter WHERE clauses.
- **@/ alias for cross-route SongPlayer import:** Left SongPlayer in its existing location (`src/app/quiz/success/[jobId]/_components/SongPlayer`) and imported via `@/app/quiz/success/[jobId]/_components/SongPlayer`. The alias is stable and avoids unnecessary file moves.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added JS-level null filter as safety guard**
- **Found during:** Task 2 (Dashboard page implementation and test run)
- **Issue:** Test 4 asserted `mockGetAudioPresignedUrl` was not called for songs with null r2Mp3Key, but page called Promise.all on DB results before JS filtering — when mock returned null-key song from DB chain, page still tried to presign it
- **Fix:** Added `const completedSongs = userSongs.filter((s) => s.r2Mp3Key !== null)` before Promise.all as defense-in-depth (Drizzle's isNotNull already filters at DB level)
- **Files modified:** `src/app/dashboard/page.tsx`
- **Verification:** All 4 dashboard page tests pass after fix
- **Committed in:** `6653838` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug fix for null safety)
**Impact on plan:** Improvement — adds defense-in-depth null guard. No scope creep.

## Issues Encountered

Pre-existing test failures discovered in `src/components/landing/` (HeroAudioCard, VideoSection, BottomCtaSection). Confirmed pre-existing by stash test. Logged to `deferred-items.md`. Not caused by this plan's changes.

## Next Phase Readiness

- /dashboard fully functional — auth-gated, lists completed songs with playback and download
- Ready for 31-03: success page additions (AuthPrompt + RecipientEmailForm)

---
*Phase: 31-success-page-dashboard-ui*
*Completed: 2026-03-07*
