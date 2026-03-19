---
phase: quick-16
plan: 01
subsystem: ui/player
tags: [ui, player, framer-motion, animation, dashboard]
dependency_graph:
  requires: []
  provides: [modern-song-player-ui]
  affects: [dashboard, success-page, share-page]
tech_stack:
  added: []
  patterns: [framer-motion AnimatePresence, conditional rotation animation]
key_files:
  created: []
  modified:
    - src/app/quiz/success/[jobId]/_components/SongPlayer.tsx
    - src/app/dashboard/_components/SongCard.tsx
    - src/app/quiz/success/[jobId]/page.tsx
    - src/app/share/[songId]/page.tsx
    - src/app/quiz/success/[jobId]/page.test.tsx
decisions:
  - "Album art rotation uses conditional animate (not mount/unmount) — cleaner state, no jank on play/pause toggle"
  - "Share page outer bg-card wrapper removed — SongPlayer already renders its own card container"
  - "recipientName passed as `|| undefined` in success page to avoid passing empty string to prop"
metrics:
  duration: ~5 minutes
  completed: 2026-03-19
  tasks_completed: 2
  files_modified: 5
---

# Quick Task 16: SongPlayer Modern Music Player UI Summary

**One-liner:** Redesigned SongPlayer with circular rotating album art, AnimatePresence play/pause toggle, styled progress bar thumb, and song title/recipient display via two new optional props.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Redesign SongPlayer with modern music player UI | 726933e | SongPlayer.tsx |
| 2 | Update all SongPlayer consumers to pass new props | 1fb7abf | SongCard.tsx, page.tsx, share/page.tsx, page.test.tsx |

## What Was Built

### SongPlayer Redesign (Task 1)

**New visual structure:**
- Circular album art placeholder (80px mobile / 96px desktop): gradient `from-primary/30 via-primary/10 to-accent/20` with centered `Music` icon
- Album art rotates continuously (8s/revolution) via `framer-motion motion.div` when playing, stops on pause — implemented with conditional `animate` prop (not mount/unmount) for smooth behavior
- Horizontal top row: `[Album Art] [Title + Recipient] [Play Button]`
- Progress bar below: `h-1.5` track, thinner than previous `h-2`, with hover/drag thumb (`w-3.5 h-3.5 rounded-full bg-primary ring-2 ring-white`)
- Play/Pause button: `AnimatePresence mode="wait"` with scale + opacity enter/exit (0.15s) on icon swap

**New props added:**
- `songTitle?: string` — displayed as song name in `font-display text-base font-semibold`
- `recipientName?: string` — displayed as "For {name}" in `text-sm text-muted-foreground`
- Info block only renders when either prop is provided

**Preserved without modification:**
- All audio event listeners (timeupdate, loadedmetadata, ended, canplay)
- Preview mode logic (30s cap, previewEnded state, onPreviewEnd callback)
- handlePlayPause (preview reset, analytics tracking)
- handleMouseDown / handleTouchStart / handleDragStart / seekTo / getTimeFromX
- progressPercent calculation
- Preview ended gradient overlay
- formatTime utility

### Consumer Updates (Task 2)

- **SongCard.tsx**: Passes `displayTitle` (title or "A song for {recipient}") and `recipientName`
- **success/[jobId]/page.tsx**: Passes `recipientName` from searchParams (guarded with `|| undefined`)
- **share/[songId]/page.tsx**: Passes `song.title || undefined` and `song.recipientName`; removed redundant outer `bg-card` div wrapper
- **page.test.tsx**: Updated SongPlayer mock to accept `songTitle?` and `recipientName?` with `data-title` and `data-recipient` test attributes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Clean-up] Removed outer bg-card wrapper on share page**
- **Found during:** Task 2
- **Issue:** Share page wrapped SongPlayer in `<div className="bg-card rounded-2xl border border-border p-6">` — redundant now that SongPlayer renders its own identical card container
- **Fix:** Replaced wrapper+SongPlayer with SongPlayer directly
- **Files modified:** src/app/share/[songId]/page.tsx
- **Commit:** 1fb7abf

## Verification

- TypeScript: Zero new errors (3 pre-existing unrelated errors in Header.test.tsx, VideoSection.test.tsx, quiz-prompt.test.ts remain unchanged)
- Tests: 22/22 pass across 4 test files (`npx vitest run src/app/quiz/success`)

## Self-Check: PASSED

Files exist:
- src/app/quiz/success/[jobId]/_components/SongPlayer.tsx — FOUND
- src/app/dashboard/_components/SongCard.tsx — FOUND
- src/app/quiz/success/[jobId]/page.tsx — FOUND
- src/app/share/[songId]/page.tsx — FOUND

Commits exist:
- 726933e — feat(quick-16): redesign SongPlayer with modern music player UI
- 1fb7abf — feat(quick-16): pass songTitle and recipientName to SongPlayer across all consumers
