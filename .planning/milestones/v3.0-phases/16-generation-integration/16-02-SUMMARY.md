---
phase: 16-generation-integration
plan: "02"
subsystem: quiz-ui
tags: [quiz, generation, loading-overlay, state-machine, framer-motion]
dependency_graph:
  requires:
    - "16-01 (POST /api/quiz-generate endpoint, QuizData types)"
    - "15-quiz-funnel (quiz page, quiz steps, localStorage)"
    - "framer-motion (AnimatePresence, motion)"
    - "lucide-react (Music icon)"
  provides:
    - "GeneratingOverlay: personalized animated loading state component"
    - "Quiz page generation flow: idle -> generating -> success/error state machine"
    - "Success route scaffold at /quiz/success/[jobId]"
  affects:
    - "16-03 (success page will poll this jobId for audio readiness)"
    - "17 (success page builds out confetti, playback, download on top of scaffold)"
tech_stack:
  added: []
  patterns:
    - "genStatus state machine: 'idle' | 'generating' | 'error'"
    - "AnimatePresence wraps all three states for smooth transitions"
    - "reducedMotion prop propagated from quiz page to overlay"
    - "localStorage only cleared after confirmed API success"
    - "void handleCreate() pattern to call async from sync goNext()"
key_files:
  created:
    - src/app/quiz/_components/GeneratingOverlay.tsx
    - src/app/quiz/success/[jobId]/page.tsx
  modified:
    - src/app/quiz/page.tsx
decisions:
  - "isGenerating variable extracted from genStatus to avoid TypeScript narrowing error on disabled prop inside 'idle' branch"
  - "AnimatePresence wraps entire quiz page content (not just overlay) — enables smooth fade between idle/generating/error states"
  - "Success route uses Next.js 15 async params pattern (await params)"
  - "Error state preserves quiz data by keeping genStatus='error' (not resetting to initial) — user returns to quiz with data intact on Try Again"
metrics:
  duration_minutes: 2
  completed_date: "2026-03-06"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  tests_added: 0
---

# Phase 16 Plan 02: Quiz UI Wiring and Loading Overlay Summary

**One-liner:** Animated GeneratingOverlay with rotating personalized messages and a three-state quiz page machine that POSTs to /api/quiz-generate, shows the overlay during generation, and redirects to /quiz/success/[jobId] on success.

## What Was Built

### `src/app/quiz/_components/GeneratingOverlay.tsx`

Full-page animated loading state component:

- Accepts `{ recipientName: string; reducedMotion?: boolean }` props
- 5 rotating personalized messages using `useState` + `useEffect` setInterval (2500ms rotation), with name fallback to "them" when empty
- `AnimatePresence mode="wait"` for smooth fade-in/out between messages (not hard swap)
- Framer-motion pulsing `Music` icon (Lucide, size 48, text-primary): `scale: [1, 1.15, 1]` on repeat, skipped when `reducedMotion` is true
- Subtle `"This usually takes about 10 seconds"` copy in `text-sm text-muted-foreground`
- Layout: `min-h-[60vh] flex flex-col items-center justify-center gap-6`

### `src/app/quiz/success/[jobId]/page.tsx`

Success route scaffold:

- Server component (async, no 'use client')
- Next.js 15 pattern: `const { jobId } = await params`
- Minimal scaffold with heading "Preparing your song..." and job ID display
- Comment noting Phase 17 builds out confetti, playback, download

### `src/app/quiz/page.tsx` (modified)

Generation flow wired to API:

- Added `useRouter` + `GeneratingOverlay` imports
- Added `genStatus: 'idle' | 'generating' | 'error'` and `genError: string | null` state
- `handleCreate()` async function: POST to `/api/quiz-generate`, parse success/error, `localStorage.removeItem(QUIZ_STORAGE_KEY)` only on success, then `router.push(/quiz/success/${jobId})`
- `goNext()` calls `void handleCreate()` on the final step (replacing the Phase 16 placeholder `console.log`)
- Render wrapped in `AnimatePresence`: generating state shows `<GeneratingOverlay>`, error state shows red message + "Try Again" button, idle shows normal quiz flow
- "Create My Song" button has `disabled={isGenerating}` with `disabled:opacity-50 disabled:cursor-not-allowed` styling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript narrowing error on `disabled` prop**

- **Found during:** Task 2 verification (`tsc --noEmit`)
- **Issue:** Inside the `genStatus === 'idle'` render branch, TypeScript narrows `genStatus` to `'idle'` — making `disabled={genStatus === 'generating'}` always false, causing TS error TS2367
- **Fix:** Extracted `const isGenerating = genStatus === 'generating'` at the top-level component scope (before narrowing occurs), used `disabled={isGenerating}` in the button
- **Files modified:** `src/app/quiz/page.tsx`
- **Commit:** `8142fb4`

## Self-Check: PASSED

All files verified:
- FOUND: `src/app/quiz/_components/GeneratingOverlay.tsx`
- FOUND: `src/app/quiz/success/[jobId]/page.tsx`
- FOUND: `src/app/quiz/page.tsx` (modified)

All commits verified:
- FOUND: `55255b5` (feat(16-02): add GeneratingOverlay component and success route scaffold)
- FOUND: `8142fb4` (feat(16-02): wire quiz page to generation API with state machine)
