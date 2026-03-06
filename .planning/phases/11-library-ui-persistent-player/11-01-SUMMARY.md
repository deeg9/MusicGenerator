---
phase: 11-library-ui-persistent-player
plan: 01
subsystem: ui
tags: [react, context, reducer, vitest, lucide-react, playlist, audio]

# Dependency graph
requires:
  - phase: 10-library-data-layer
    provides: LibrarySongCard display component, presigned URLs, library RSC page
  - phase: 09-foundation-fixes-navigation
    provides: AudioPlayerContext, BottomAudioPlayer persistent bar

provides:
  - AudioPlayerContext with playlist state (PlaylistEntry[], currentIndex, setPlaylist, skipNext, skipPrev)
  - genre and totalVariants fields on AudioTrack
  - LibrarySongCard client component with play/pause button and active-track highlighting
  - LibraryList client wrapper that builds flat playlist from all songs/outputs
  - RSC library page passing serializable ISO string dates to client components

affects:
  - 11-02 (skip controls — uses skipNext/skipPrev from this plan)
  - 11-03 (scramble text — uses active card state)
  - BottomAudioPlayer (consumes extended context, no changes needed)
  - VariantCard (standalone play() preserved — no playlist cleared)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RSC serialization: Date.toISOString() before crossing RSC→client boundary"
    - "TDD red-green: write failing tests, implement to pass, no separate refactor needed"
    - "AudioPlayerContext reducer: PLAY does NOT clear playlist (VariantCard backward compat)"
    - "entryToTrack() helper derives AudioTrack from PlaylistEntry for type safety"
    - "data-testid='song-card' for test targeting without brittle class selectors"

key-files:
  created:
    - src/contexts/AudioPlayerContext.test.tsx
    - src/components/LibraryList.tsx
  modified:
    - src/contexts/AudioPlayerContext.tsx
    - src/components/LibrarySongCard.tsx
    - src/components/LibrarySongCard.test.tsx
    - src/app/library/page.tsx

key-decisions:
  - "PLAY action does NOT clear playlist or currentIndex — VariantCard standalone playback must not wipe library playlist state"
  - "startedAt passed as ISO string (not Date) across RSC→client boundary to avoid serialization errors"
  - "LibraryList builds flat PlaylistEntry[] from all songs/outputs, computing per-song startIndex"
  - "genre? in PlaylistEntry uses undefined (not null) as absent sentinel to match PlaylistEntry interface"

patterns-established:
  - "RSC boundary pattern: convert Dates to ISO strings in RSC page before passing to client wrapper"
  - "Playlist pattern: LibraryList owns playlist construction; cards receive pre-built playlist + startIndex"

requirements-completed: [LIB2-04, PERS-01, PERS-05]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 11 Plan 01: Library UI Persistent Player Summary

**Playlist-aware AudioPlayerContext with flat PlaylistEntry queue, skip actions, and LibrarySongCard client component wired to trigger/control the persistent bottom player from library cards.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T23:42:30Z
- **Completed:** 2026-03-05T23:45:17Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- Extended AudioPlayerContext reducer with SET_PLAYLIST, SKIP_NEXT, SKIP_PREV actions and exposed playlist/currentIndex state — 14 new unit tests all passing
- Rewrote LibrarySongCard as a 'use client' component with always-visible play/pause button, active-track amber tint, and full AudioPlayerContext integration — 12 tests passing
- Created LibraryList client wrapper that builds a flat PlaylistEntry[] from all songs and computes per-song startIndex, enabling library cards to trigger correct playlist position
- Updated RSC library page to convert Date to ISO string before crossing client boundary and delegate list rendering to LibraryList

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend AudioPlayerContext with playlist, skip, and genre support** - `2d0b2c9` (feat + test)
2. **Task 2: LibraryList wrapper and LibrarySongCard client conversion with play button** - `945556d` (feat + test)

## Files Created/Modified

- `src/contexts/AudioPlayerContext.tsx` - Added PlaylistEntry type, genre/totalVariants on AudioTrack, SET_PLAYLIST/SKIP_NEXT/SKIP_PREV actions, entryToTrack() helper, setPlaylist/skipNext/skipPrev in context value
- `src/contexts/AudioPlayerContext.test.tsx` - 14 reducer unit tests covering all new actions and backward compat
- `src/components/LibrarySongCard.tsx` - Rewritten as 'use client'; play/pause button, active-track highlighting, ISO string startedAt
- `src/components/LibrarySongCard.test.tsx` - 12 tests for play/pause/resume/active-state/context integration
- `src/components/LibraryList.tsx` - New client wrapper; builds flat playlist, computes startIndex per song
- `src/app/library/page.tsx` - Uses LibraryList; converts startedAt to ISO string before crossing RSC boundary

## Decisions Made

- PLAY action does NOT clear playlist/currentIndex: VariantCard calls `play()` standalone and must not wipe an active library playlist when user switches to the generator and back
- `startedAt` is converted to ISO string in the RSC page before passing to LibraryList/LibrarySongCard to satisfy Next.js serialization requirements for server→client props
- LibraryList owns flat playlist construction; individual cards receive the pre-built playlist and their startIndex — cards don't need to know about other songs
- `genre?` in PlaylistEntry uses `undefined` (via `?? undefined`) when genreTags is null, keeping type compatibility with the PlaylistEntry interface's optional field

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type error in LibraryList playlist construction**
- **Found during:** Task 2 (TypeScript `tsc --noEmit` verification)
- **Issue:** Using `satisfies PlaylistEntry` and `filter((entry): entry is PlaylistEntry)` together hit a type predicate incompatibility because `PlaylistEntry.genre` is `string | null | undefined` but the object literal inferred `string | null`
- **Fix:** Replaced the map+filter chain with a forEach pushing valid entries into a typed `PlaylistEntry[]` array, using `?? undefined` to convert null genreTags to undefined for the optional field
- **Files modified:** src/components/LibraryList.tsx
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** 945556d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type bug)
**Impact on plan:** Minor TypeScript inference quirk; fix is strictly correct and more readable. No scope creep.

## Issues Encountered

None — plan executed cleanly. TDD cycle worked as expected: RED failures confirmed missing implementations, GREEN passed after implementing the full context extensions and component rewrites.

## Next Phase Readiness

- AudioPlayerContext now exposes `skipNext`, `skipPrev`, `playlist`, `currentIndex` — Plan 02 (skip controls in BottomAudioPlayer) has everything it needs
- Library cards trigger playback with correct playlist position — the play-from-card flow is complete
- `genre` and `totalVariants` fields on AudioTrack are available for Plan 03 (scramble text display)
- Blocker note from STATE.md (AudioPlayerContext init timing race) should be manually verified at /library during this phase's verification step

---

*Phase: 11-library-ui-persistent-player*
*Completed: 2026-03-05*
