---
phase: 17-success-page
plan: "02"
subsystem: success-page
tags: [confetti, audio-player, success-page, gift-reveal, polling, client-component]
dependency_graph:
  requires: [17-01]
  provides: [success-page-ui, confetti-blast, song-player, share-prompt]
  affects: [quiz-funnel-completion]
tech_stack:
  added: []
  patterns: [polling-state-machine, native-audio-element, canvas-confetti, framer-motion]
key_files:
  created:
    - src/app/quiz/success/[jobId]/_components/ConfettiBlast.tsx
    - src/app/quiz/success/[jobId]/_components/SongPlayer.tsx
    - src/app/quiz/success/[jobId]/_components/SharePrompt.tsx
  modified:
    - src/app/quiz/success/[jobId]/page.tsx
decisions:
  - "ConfettiBlast renders null — canvas-confetti appends its own canvas to document.body"
  - "Polling uses cancelled flag closure (not ref) for async cleanup safety"
  - "sleep() helper avoids setInterval complexity in the polling while loop"
  - "SongPlayer play() returns Promise — void-wrapped to satisfy no-floating-promises"
  - "Progress bar click calculates seek position from getBoundingClientRect offset"
metrics:
  duration: "~2 min"
  completed: "2026-03-06"
  tasks_completed: 2
  files_changed: 4
---

# Phase 17 Plan 02: Success Page UI Summary

Celebratory success page — the emotional gift reveal payoff of the Notevra funnel, built with confetti blast, native audio player, download CTA, sharing prompt, and a polling state machine that is refresh-safe by design.

## What Was Built

### Task 1: ConfettiBlast, SongPlayer, SharePrompt Components (commit a4a670d)

Three purpose-built client components in `src/app/quiz/success/[jobId]/_components/`:

**ConfettiBlast.tsx**
- Fires two brand-colored confetti bursts (left + right, 150ms apart) using `canvas-confetti`
- Respects `useReducedMotion` — skips animation entirely if user prefers reduced motion
- Renders null — canvas-confetti manages its own canvas appended to `document.body`
- Brand colors: blue-500 (#4a90d9), yellow-400 (#f5d060), white, blue-300 (#7bb8f5)

**SongPlayer.tsx**
- Props: `{ src: string }`
- Native `<audio>` element (no autoplay — browsers block it; user clicks play)
- Event listeners: `timeupdate`, `loadedmetadata`, `ended`, `canplay` — all cleaned up on unmount
- Large circular play/pause button with Lucide icons, bg-primary styling
- Full-width clickable progress bar: seek on click via `getBoundingClientRect` calculation
- Time display in `mm:ss` format for current time and total duration

**SharePrompt.tsx**
- Static warm encouragement card — headline "Capture the moment"
- Encourages recording recipient's reaction video for maximum emotional impact
- "Copy link to this song" button using `navigator.clipboard.writeText(window.location.href)`
- Copied state confirmation (2s timeout, shows Check icon)

### Task 2: Success Page with Polling State Machine (commit 580388b)

Full `'use client'` replacement for the scaffold in `src/app/quiz/success/[jobId]/page.tsx`:

**State machine:** `'loading' | 'ready' | 'error' | 'timeout'`

**Polling loop:**
- `POLL_INTERVAL_MS = 2000`, `POLL_TIMEOUT_MS = 120_000` (2 minutes)
- `cancelled` closure flag for cleanup — all state updates guarded by `if (!cancelled)`
- `sleep()` helper creates `POLL_INTERVAL_MS` delay between polls
- Transient HTTP errors and network errors continue polling (no error state on catch)
- COMPLETED: sets `audioUrl = /api/audio/{jobId}`, transitions to `ready`
- FAILED: transitions to `error`
- Timeout: transitions to `timeout`

**Four rendered states:**
1. **loading** — pulsing Music icon, personalized copy ("Creating your song for {name}..."), animated dots
2. **ready** — ConfettiBlast fires, Framer Motion fade-in reveal, SongPlayer, download `<a>`, Create Another button, SharePrompt
3. **error** — warm yellow icon, friendly copy, "Try Again" to /quiz
4. **timeout** — warm yellow icon, "warming up" copy, "Try Again" to /quiz

**Key behaviors:**
- `buildGiftFilename(name)` produces `notevra-song-for-{slug}.mp3` for download attribute
- `handleCreateAnother()` calls `localStorage.removeItem('notevra_quiz_v1')` then `router.push('/quiz')`
- `recipientName` extracted from `?name=` URL param via `use(searchParams)` — localStorage cleared before redirect in Phase 16, so URL param is the only safe carrier
- Fully refresh-safe: jobId from URL path is the only required state

## Verification

- TypeScript: `npx tsc --noEmit` — 0 errors in success page files (122 pre-existing test file errors excluded, out of scope)
- `'use client'` directive present in all four files
- `canvas-confetti` import confirmed in ConfettiBlast
- `HTMLAudioElement` ref and `<audio>` element confirmed in SongPlayer
- `localStorage.removeItem('notevra_quiz_v1')` confirmed in page
- `/api/poll-job/{jobId}` polling and `/api/audio/{jobId}` audioUrl confirmed in page
- `buildGiftFilename` used in download link's `download` attribute

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
