---
phase: 15-quiz-funnel
plan: "01"
subsystem: quiz-funnel
tags: [quiz, framer-motion, localStorage, types, components]
dependency_graph:
  requires: []
  provides: [quiz-types, quiz-page-shell, quiz-shared-components]
  affects: [Phase 16 generation trigger]
tech_stack:
  added: []
  patterns:
    - Direction-aware AnimatePresence slide with custom={direction} on both AP and motion.div
    - localStorage try/catch pattern for SSR-safe persistence
    - Per-step QuizCard wrapper with font-display heading + muted subtitle
    - SelectionCard and PillButton reusable selection primitives
key_files:
  created:
    - src/lib/quiz-types.ts
    - src/app/quiz/page.tsx
    - src/app/quiz/_components/QuizProgress.tsx
    - src/app/quiz/_components/QuizProgress.test.tsx
    - src/app/quiz/_components/QuizCard.tsx
    - src/app/quiz/_components/SelectionCard.tsx
    - src/app/quiz/_components/PillButton.tsx
  modified: []
decisions:
  - "localStorage key: notevra_quiz_v1 (versioned for future schema migrations)"
  - "Step index NOT persisted — user returns to Step 1 on refresh with data pre-filled"
  - "useReducedMotion drives duration: 0.3s or 0 — no separate animation toggle needed"
  - "Back button renders a hidden spacer div on Step 0 to keep Next button right-aligned without layout shift"
metrics:
  duration: "~2 min"
  completed_date: "2026-03-06"
  tasks_completed: 2
  files_created: 7
---

# Phase 15 Plan 01: Quiz Funnel Foundation Summary

**One-liner:** QuizData type contract + shared quiz components (QuizProgress/QuizCard/SelectionCard/PillButton) + animated 6-step page shell with direction-aware Framer Motion transitions and localStorage persistence.

## What Was Built

Phase 15 plan 01 establishes the complete quiz funnel foundation that Plans 02 and 03 will populate with real step content.

### Quiz Type Contract (`src/lib/quiz-types.ts`)

Exported `QuizData` interface with all 6 steps' fields: `relationshipType` (RelationshipType union | ''), `recipientName`, `genre`, `voicePreference` (VoicePreference union), `qualities`, `memories`, `message`, `language`, `email`. `INITIAL_QUIZ_DATA` const provides sensible defaults (voicePreference: 'No Preference', language: 'English', others: ''). Phase 16 imports this directly.

### Shared Components

- **QuizProgress** — Dots row + "Step N of M" text with `role="progressbar"` aria attributes. Active dot is `w-4 bg-primary`, completed dots are `w-2 bg-primary/50`, upcoming are `w-2 bg-border`. `transition-all duration-300` animates width/color.
- **QuizCard** — Centered card wrapper: `max-w-2xl mx-auto bg-card rounded-2xl shadow-medium p-6 sm:p-8`. Title in `font-display text-2xl font-bold`, subtitle in `text-muted-foreground`.
- **SelectionCard** — Clickable `<button type="button">` with `aria-pressed`, `border-2 rounded-xl p-4`. Selected: `border-primary bg-primary/10 shadow-medium`. Unselected: `border-border bg-card shadow-subtle hover:border-primary/50`.
- **PillButton** — Pill toggle `<button type="button">` with `aria-pressed`, `rounded-full px-5 py-2`. Selected: `bg-primary text-primary-foreground`. Unselected: `bg-muted text-muted-foreground`.

### Quiz Page Shell (`src/app/quiz/page.tsx`)

'use client' component managing all wizard state:
- `data: QuizData` — form data
- `currentStep: number` — 0–5
- `direction: number` — 1 (forward) / -1 (back) for slide direction
- `errors: Record<string, string>` — validation error display

localStorage: read on mount from `notevra_quiz_v1`, write on every data change. Both wrapped in try/catch for SSR safety and quota errors.

AnimatePresence: `mode="wait"`, `custom={direction}` passed to both `<AnimatePresence>` and `<motion.div>`. Direction-aware `slideVariants` enter from 100%/-100% and exit to -100%/100%. `useReducedMotion` sets duration to 0 when user prefers reduced motion.

Navigation: `goNext()`, `goBack()`, `updateData()` (merges fields, clears matching errors), `setStepErrors()`. Back button hidden on Step 0 (spacer div keeps layout stable). Step 5 button reads "Create My Song" (no-op until Phase 16).

Build output: `/quiz` route shows as `○ (Static)` — Next.js correctly detects it.

## Tests

| Test | File | Result |
|------|------|--------|
| Renders "Step 1 of 6" for currentStep=0 | QuizProgress.test.tsx | PASS |
| Renders "Step 3 of 6" for currentStep=2 | QuizProgress.test.tsx | PASS |
| Renders 6 dots total | QuizProgress.test.tsx | PASS |
| Active dot has bg-primary and w-4 | QuizProgress.test.tsx | PASS |

## Commits

| Hash | Message |
|------|---------|
| fbfc5b6 | feat(15-01): create QuizData type contract and shared quiz UI components |
| 932336c | feat(15-01): create quiz page shell with AnimatePresence transitions and localStorage |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/lib/quiz-types.ts` — exists, exports QuizData, RelationshipType, VoicePreference, INITIAL_QUIZ_DATA
- [x] `src/app/quiz/page.tsx` — exists, 197 lines (well above 80-line min)
- [x] `src/app/quiz/_components/QuizProgress.tsx` — exists, exports QuizProgress
- [x] `src/app/quiz/_components/QuizProgress.test.tsx` — exists, 4 tests all passing
- [x] `src/app/quiz/_components/QuizCard.tsx` — exists, exports QuizCard
- [x] `src/app/quiz/_components/SelectionCard.tsx` — exists, exports SelectionCard
- [x] `src/app/quiz/_components/PillButton.tsx` — exists, exports PillButton
- [x] Commits fbfc5b6 and 932336c — verified in git log
- [x] `npx next build` — succeeds, /quiz listed as static route
- [x] `npx vitest run src/app/quiz` — 4/4 tests pass

## Self-Check: PASSED
