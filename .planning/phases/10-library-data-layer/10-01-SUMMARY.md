---
phase: 10-library-data-layer
plan: 01
subsystem: ui
tags: [drizzle, react, server-components, r2, presigned-urls, vitest, testing-library]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Drizzle schema with generations/outputs tables and relations, R2 presigned URL utility"
provides:
  - "async RSC /library page querying Drizzle for completed generations with presigned URLs"
  - "LibraryEmpty component with branded empty state and CTA"
  - "LibrarySongCard component with title, genre pills, duration, date, instrumental badge"
  - "display-utils: formatDuration, deriveTitle, formatRelativeDate pure functions"
  - "error.tsx client error boundary for DB/R2 failures"
affects:
  - "11-library-playback"
  - "12-animations"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "async RSC with Drizzle relational API (db.query.generations.findMany with: outputs)"
    - "Parallel presigned URL generation via Promise.all + .catch(() => null) error isolation"
    - "TDD with vitest: write failing tests → implement → green"
    - "Async RSC testing: await Component() then render() the JSX result"
    - "Mock pattern: vi.mock('@/db') + vi.mock('@/lib/r2') for RSC unit tests"

key-files:
  created:
    - src/lib/display-utils.ts
    - src/lib/display-utils.test.ts
    - src/components/LibraryEmpty.tsx
    - src/components/LibraryEmpty.test.tsx
    - src/components/LibrarySongCard.tsx
    - src/components/LibrarySongCard.test.tsx
    - src/app/library/error.tsx
  modified:
    - src/app/library/page.tsx
    - src/app/library/page.test.tsx

key-decisions:
  - "LibrarySongCard is pure display — no play button added (Phase 11 adds audio playback)"
  - "Presigned URL errors isolated per-output via .catch(() => null) so one R2 failure does not block the whole page"
  - "deriveTitle truncates at exactly 40 chars using Unicode ellipsis (U+2026) not three dots"
  - "formatRelativeDate thresholds: <1hr Just now, <24hr N hours ago, <48hr Yesterday, else month+day"

patterns-established:
  - "Async RSC pattern: fetchX() helper + await in page component, no useState/useEffect"
  - "TDD with fake timers: vi.useFakeTimers() + vi.setSystemTime() for time-sensitive unit tests"
  - "Genre pill split: genreTags?.split(',').map(tag => tag.trim()).filter(Boolean) ?? []"

requirements-completed: [LIB2-02, LIB2-03, LIB2-06]

# Metrics
duration: 4min
completed: 2026-03-05
---

# Phase 10 Plan 01: Library Data Layer Summary

**Async RSC /library page with Drizzle generations query, parallel R2 presigned URLs, song cards with genre pills/duration/date, and branded empty state — 34 unit tests via TDD**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T22:38:19Z
- **Completed:** 2026-03-05T22:42:02Z
- **Tasks:** 2
- **Files modified:** 9 (7 created, 2 rewritten)

## Accomplishments
- Replaced library stub with real async RSC querying Drizzle for completed generations with their outputs and presigned URLs
- Built 3 pure display utilities (formatDuration, deriveTitle, formatRelativeDate) with 16 unit tests covering edge cases
- Built LibraryEmpty (extracted from old stub, named export) and LibrarySongCard (genre pills, duration, date, instrumental badge) with 13 component tests
- Built error.tsx client error boundary with Try again button for DB/R2 failure recovery
- 5 async RSC page tests using mocked @/db and @/lib/r2 covering LIB2-02, LIB2-03, LIB2-06

## Task Commits

Each task was committed atomically:

1. **Task 1: Display utilities, LibraryEmpty, and LibrarySongCard** - `474e752` (feat)
2. **Task 2: RSC library page with Drizzle query, presigned URLs, and error boundary** - `0b73644` (feat)

_Note: Task 1 used TDD — tests written before implementation_

## Files Created/Modified
- `src/lib/display-utils.ts` - formatDuration, deriveTitle, formatRelativeDate pure functions
- `src/lib/display-utils.test.ts` - 16 unit tests including fake timer tests for formatRelativeDate
- `src/components/LibraryEmpty.tsx` - Branded empty state (Library icon, heading, CTA to /)
- `src/components/LibraryEmpty.test.tsx` - 4 component tests
- `src/components/LibrarySongCard.tsx` - Song card with title, genre pills, duration, date, instrumental badge
- `src/components/LibrarySongCard.test.tsx` - 9 component tests including null/empty edge cases
- `src/app/library/page.tsx` - Rewritten as async RSC with Drizzle + presigned URLs
- `src/app/library/page.test.tsx` - Rewritten with mocked DB/R2, 5 async RSC tests
- `src/app/library/error.tsx` - New "use client" error boundary

## Decisions Made
- LibrarySongCard is purely display with no play button — Phase 11 adds audio playback and will wire up the playbackUrls prop
- Presigned URL errors are isolated per-output via `.catch(() => null)` so a single R2 failure cannot block the whole library page
- deriveTitle truncates at exactly 40 characters with Unicode ellipsis (U+2026) — a single character, not three dots
- formatRelativeDate thresholds kept simple: <1hr → Just now, <24hr → N hours ago, <48hr → Yesterday, else short date

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Two pre-existing issues discovered during full suite regression check. Both are out of scope for this plan and documented in `deferred-items.md`:

1. **HeroSection.test.tsx (2 failures):** Tests query `a[href="#create"]` which no longer exists. Pre-existing before Phase 10 — confirmed by stashing changes and running tests.
2. **style-guide build error:** `src/app/style-guide/page.tsx` calls `notFound()` at module top level in production, causing `npx next build` to fail. Pre-existing issue — TypeScript (`npx tsc --noEmit`) passes with zero errors.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- /library page is fully functional with real Drizzle data and presigned URLs
- LibrarySongCard accepts playbackUrls prop — ready for Phase 11 to wire up audio playback
- Phase 11 (library-playback) can build on this data layer immediately
- Pre-existing HeroSection and style-guide issues should be resolved before Phase 11 full suite is expected to be green

---
*Phase: 10-library-data-layer*
*Completed: 2026-03-05*
