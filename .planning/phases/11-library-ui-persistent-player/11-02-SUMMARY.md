---
phase: 11-library-ui-persistent-player
plan: 02
subsystem: ui
tags: [wavesurfer, audio-player, playlist, react, lucide-react, tdd]

# Dependency graph
requires:
  - phase: 11-01
    provides: AudioPlayerContext with playlist/skipNext/skipPrev, PlaylistEntry type

provides:
  - BottomAudioPlayer with skip forward/backward buttons (playlist-aware)
  - Genre subtitle display in player bar
  - Variant badge display (e.g. "1/2", "2/2")
  - Auto-advance on track finish via skipNext()
  - canSkipNextRef/canSkipPrevRef stale-closure-safe pattern for wavesurfer handlers

affects: [12-animations-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ref-based stale-closure guard: canSkipNextRef/canSkipPrevRef updated via useEffect to safely read skip state inside wavesurfer event handlers (follows phaseRef pattern from Phase 9)"
    - "Conditional playlist UI: skip buttons render only when playlist.length > 0, invisible when playing standalone VariantCard"

key-files:
  created:
    - src/components/layout/BottomAudioPlayer.test.tsx
  modified:
    - src/components/layout/BottomAudioPlayer.tsx

key-decisions:
  - "canSkipNextRef/canSkipPrevRef pattern chosen to avoid stale closures in wavesurfer onFinish — same approach as phaseRef in Phase 9 for wavesurfer event handlers"
  - "Skip buttons hidden entirely (not just disabled) when playlist is empty — clean UI for standalone VariantCard playback"
  - "handleSkipPrev seeks to start (wavesurfer.seekTo(0)) when at index 0 instead of doing nothing — better UX for restart"

patterns-established:
  - "Stale-closure-safe refs: when wavesurfer event handlers need reactive state, update a ref in useEffect and read the ref inside the handler"

requirements-completed: [PERS-02, PERS-03, PERS-04]

# Metrics
duration: 8min
completed: 2026-03-05
---

# Phase 11 Plan 02: BottomAudioPlayer Skip Controls, Genre Display, and Auto-advance Summary

**Skip forward/backward controls, genre subtitle, variant badge (1/2), and auto-advance on finish added to BottomAudioPlayer using stale-closure-safe ref pattern for wavesurfer event handlers**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-05T23:47:44Z
- **Completed:** 2026-03-05T23:55:54Z
- **Tasks:** 1 (TDD: 2 commits — test RED then feat GREEN)
- **Files modified:** 2

## Accomplishments

- Skip backward and skip forward buttons render between track info and play/pause (desktop), hidden on mobile
- Skip buttons disabled at playlist boundaries using canSkipNext/canSkipPrev booleans
- Skip buttons hidden entirely when playlist is empty (standalone VariantCard playback unaffected)
- Auto-advance on track finish: calls skipNext() if canSkipNext, else pause()
- Genre text displayed below title as text-xs text-muted-foreground (replaced old "Variant N" subtitle)
- Variant badge "1/2" / "2/2" renders inline next to title when totalVariants > 1
- Mobile layout shows genre text but no skip buttons (compact layout preserved)
- 15 tests added covering all behaviors; full TDD RED → GREEN cycle

## Task Commits

Each task was committed atomically (TDD pattern):

1. **Task 1 RED: Add failing tests for skip controls, genre subtitle, and variant badge** - `f83183b` (test)
2. **Task 1 GREEN: Add skip controls, genre subtitle, variant badge, and auto-advance** - `24423fe` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD task has two commits: test (RED) then feat (GREEN)._

## Files Created/Modified

- `src/components/layout/BottomAudioPlayer.test.tsx` - 15 unit tests covering genre display, variant badge, skip button render/disabled/click behavior
- `src/components/layout/BottomAudioPlayer.tsx` - PlayerContent enhanced with skip controls, genre subtitle, variant badge, auto-advance, canSkipNextRef/canSkipPrevRef

## Decisions Made

- **canSkipNextRef/canSkipPrevRef pattern**: Wavesurfer's `onFinish` event handler is registered in a `useEffect` with deps `[wavesurfer, ...]`. Since canSkipNext/canSkipPrev are computed values (not stable refs), reading them inside the handler would create stale closures. Instead, two refs are updated via separate `useEffect` calls whenever canSkipNext/canSkipPrev change — the handler reads the refs. This is the same phaseRef pattern established in Phase 9.
- **Skip buttons hidden (not just disabled) when playlist is empty**: When a user plays from VariantCard (no playlist), the skip button controls should not appear at all — cleaner UI than showing disabled buttons.
- **handleSkipPrev seeks to start at index 0**: When at the beginning of the playlist, the "Previous" button seeks current track to start instead of being a no-op. Consistent with common music player UX.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - pre-existing test failures (HeroSection and LibrarySongCard CSS assertions) were present before this plan and are out of scope per deviation rules. They are noted here for awareness: 6 pre-existing failures remain in the suite, unchanged by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BottomAudioPlayer now has full playlist navigation (skip + auto-advance) ready for Phase 12 animations/polish
- Genre and variant badge display complete
- All PERS-02, PERS-03, PERS-04 requirements implemented
- Blocker note from STATE.md (initialization timing race) was not observed during implementation — library card play() calls appear to work correctly with the current wavesurfer initialization flow

---
*Phase: 11-library-ui-persistent-player*
*Completed: 2026-03-05*
