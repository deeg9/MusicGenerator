---
phase: 03-playback-and-download
plan: 02
subsystem: ui
tags: [wavesurfer, react, waveform, audio, playback, download, url-persistence, vitest]

# Dependency graph
requires:
  - phase: 03-playback-and-download
    provides: Status API with mp3Url, wavUrl, mp3FileSizeBytes, promptText per output
  - phase: 02-generation-api
    provides: GenerationPage, GenerationResults, VariantCard, useGenerationStatus hook

provides:
  - WaveformPlayer with violet bar waveform, play/pause/seek, time display, auto-pause
  - Redesigned VariantCard with dual MP3/WAV download buttons and active violet glow
  - GenerationResults auto-pause coordination via activeVariantId state
  - URL persistence: jobId written to ?job= param; restored on page refresh
  - Suspense wrapper on page.tsx for useSearchParams compatibility
affects: [03-03-human-verify, frontend-playback-experience]

# Tech tracking
tech-stack:
  added: [wavesurfer.js@7.12.1, @wavesurfer/react@1.0.12]
  patterns: [useWavesurfer hook for declarative waveform, isActive/onPlay prop pattern for multi-player coordination, useSearchParams + useRouter for URL state sync]

key-files:
  created:
    - src/components/WaveformPlayer.tsx
  modified:
    - src/components/VariantCard.tsx
    - src/components/GenerationResults.tsx
    - src/components/GenerationPage.tsx
    - src/app/page.tsx
    - src/hooks/useGenerationStatus.ts
    - src/components/WaveformPlayer.test.tsx
    - src/components/GenerationResults.test.tsx

key-decisions:
  - "WaveformPlayer uses MP3 URL for playback (smaller file, faster load); falls back to WAV if mp3Url is null"
  - "Auto-pause coordinated via isActive prop + onPlay callback — parent owns activeVariantId state, children are passive"
  - "URL persistence via router.replace (not push) to avoid polluting browser history on each generation"
  - "Suspense wrapper on page.tsx with fallback=null — required by Next.js App Router when descendant uses useSearchParams"

patterns-established:
  - "Multi-player coordination: parent manages activeId, passes isActive/onPlay to each child — children never talk to each other"
  - "URL state sync: read from searchParams on init, write via router.replace after action — one-way data flow"

requirements-completed: [PLAY-01, PLAY-02, PLAY-03]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 03 Plan 02: Frontend Playback and Download Summary

**wavesurfer.js waveform player with violet bar visualization, dual MP3/WAV downloads, auto-pause between variants, and jobId URL persistence via ?job= param**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T05:14:44Z
- **Completed:** 2026-03-05T05:17:30Z
- **Tasks:** 2 auto tasks complete; Task 3 (human-verify checkpoint) pending
- **Files modified:** 8

## Accomplishments

- WaveformPlayer built with wavesurfer.js bar-style waveform (violet/zinc colors), play/pause, seek-by-click, m:ss time display, and auto-pause via isActive prop
- VariantCard redesigned with stacked layout: label, waveform player, info line (duration + file size), dual MP3/WAV download buttons, violet ring glow when active
- GenerationResults manages activeVariantId — clicking play on one variant auto-pauses the other
- GenerationPage reads ?job= URL param on init and writes it after generation — refreshing page restores results
- page.tsx wrapped in Suspense to satisfy Next.js App Router requirement for useSearchParams
- All vitest tests pass (8 passing, 12 todo)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install wavesurfer, create WaveformPlayer, update hook and VariantCard** - `8929974` (feat)
2. **Task 2: Wire auto-pause in GenerationResults and add URL persistence** - `d1130da` (feat)

## Files Created/Modified

- `src/components/WaveformPlayer.tsx` - useWavesurfer hook with bar waveform, play/pause/seek, time display, auto-pause
- `src/components/VariantCard.tsx` - Redesigned: waveform player + dual download buttons + violet active glow
- `src/components/GenerationResults.tsx` - activeVariantId state, resets on jobId change, single-column layout
- `src/components/GenerationPage.tsx` - useSearchParams init + router.replace for URL persistence
- `src/app/page.tsx` - Suspense wrapper around GenerationPage
- `src/hooks/useGenerationStatus.ts` - Output interface: added mp3Url, mp3FileSizeBytes, promptText, duration fields
- `src/components/WaveformPlayer.test.tsx` - 2 real tests: render + onPlay callback
- `src/components/GenerationResults.test.tsx` - 2 real tests: variant card count + null jobId handling

## Decisions Made

- WaveformPlayer uses MP3 URL for playback (smaller, faster CORS fetch) with WAV fallback if mp3Url is null.
- Auto-pause via `isActive` prop — parent (GenerationResults) owns the active ID; WaveformPlayer useEffect pauses itself when isActive becomes false. Children never coordinate directly.
- `router.replace` (not `push`) for URL persistence — avoids polluting browser history on each generation attempt.
- `Suspense fallback={null}` on page.tsx — silent loading, no spinner flash, as recommended by Next.js docs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript error in GenerationResults after VariantCard props changed**
- **Found during:** Task 1 (after redesigning VariantCard with new props)
- **Issue:** GenerationResults still passed `url` to VariantCard, which no longer exists — caused TS2322 type error blocking compilation
- **Fix:** Updated GenerationResults to pass new props (mp3Url, wavUrl, isActive, onPlay, mp3FileSizeBytes, duration, promptText) with placeholder values
- **Files modified:** src/components/GenerationResults.tsx
- **Verification:** `npx tsc --noEmit` passes clean
- **Committed in:** `8929974` (Task 1 commit, inline fix before commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking type error)
**Impact on plan:** Necessary for TypeScript compilation. Task 2 then completed GenerationResults properly with real auto-pause wiring.

## Issues Encountered

None beyond the auto-fixed type error above.

## User Setup Required

None - no external service configuration required. R2 CORS for production domain is a pre-deploy concern noted in the plan.

## Next Phase Readiness

- Human verification checkpoint (Task 3) required: user needs to visually confirm waveform playback, downloads, and URL persistence
- After approval, Phase 03 is complete — all PLAY-01/02/03 requirements satisfied
- Production deployment will require updating R2 CORS allowed origins from localhost:3000 to the production domain

## Self-Check

- [x] `src/components/WaveformPlayer.tsx` exists
- [x] `src/components/VariantCard.tsx` updated
- [x] `src/components/GenerationResults.tsx` updated
- [x] `src/components/GenerationPage.tsx` updated
- [x] `src/app/page.tsx` updated with Suspense
- [x] Commit `8929974` exists (Task 1)
- [x] Commit `d1130da` exists (Task 2)
- [x] `npx tsc --noEmit` passes
- [x] `npm run build` succeeds
- [x] `npx vitest run` — 8 passing, 0 failures

## Self-Check: PASSED

---
*Phase: 03-playback-and-download*
*Completed: 2026-03-05*
