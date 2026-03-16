---
phase: quick-7
plan: 01
subsystem: analytics
tags: [posthog, analytics, instrumentation, dashboards]
dependency_graph:
  requires: [posthog-js]
  provides: [analytics-module, posthog-dashboards-script]
  affects: [quiz-funnel, success-page, listen-page, landing-page, providers]
tech_stack:
  added: []
  patterns: [centralized-analytics-helpers, typed-event-tracking]
key_files:
  created:
    - src/lib/analytics.ts
    - scripts/setup-posthog-dashboards.ts
  modified:
    - src/app/quiz/page.tsx
    - src/app/quiz/success/[jobId]/page.tsx
    - src/app/quiz/success/[jobId]/_components/SongPlayer.tsx
    - src/app/quiz/success/[jobId]/_components/RecipientEmailForm.tsx
    - src/app/quiz/success/[jobId]/_components/SharePrompt.tsx
    - src/app/listen/[songId]/ListenPlayer.tsx
    - src/app/listen/[songId]/page.tsx
    - src/components/landing/HeroSection.tsx
    - src/components/landing/BottomCtaSection.tsx
    - src/app/providers.tsx
decisions:
  - Centralized analytics.ts wraps posthog.capture — components never import posthog directly
  - BottomCtaSection converted to client component for onClick tracking (was server component with no dynamic content)
  - Quiz uses relationshipType as "occasion" in quiz_completed event (no separate occasion field exists)
  - SongPlayer tracks first play only (resets on replay from beginning)
  - ListenPlayer uses native audio onPlay/onEnded events (simpler than SongPlayer's custom controls)
metrics:
  duration: 6m
  completed: "2026-03-16T23:22:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 10
---

# Quick Task 7: PostHog Analytics Instrumentation & Dashboards Summary

Centralized PostHog event tracking across all Notevra touchpoints with typed helpers and dashboard creation script.

## What Was Done

### Task 1: Analytics Module + Full App Instrumentation (31c349f)

Created `src/lib/analytics.ts` with 15 typed event helper functions covering the complete user journey:

**Quiz Funnel (4 events):** `quiz_started`, `quiz_step_completed` (with step number, name, and time-on-step), `quiz_step_back`, `quiz_completed` (with total time and all quiz selections).

**Song Generation (3 events):** `song_generation_started`, `song_generation_completed` (with generation time), `song_generation_failed` (with error type).

**Engagement (6 events):** `song_played` (with source context), `song_play_completed`, `email_form_submitted`, `listen_page_opened`, `song_shared`, `song_downloaded`.

**Acquisition (1 event):** `cta_clicked` (with location and text).

**Identity (1 function):** `identifyUser` wrapping `posthog.identify()`.

Instrumented across 10 files: quiz page (step timing + completion), success page (generation lifecycle + download), SongPlayer (play/complete), RecipientEmailForm (submit), SharePrompt (copy link), ListenPlayer (page open + play), HeroSection (2 CTAs), BottomCtaSection (1 CTA), providers.tsx (identify on auth).

### Task 2: PostHog Dashboard Script (e0b27a5)

Created `scripts/setup-posthog-dashboards.ts` that uses PostHog's API to create 4 dashboards:

1. **Quiz Funnel Conversion** — sequential funnel (started through completed), daily completions trend, average time per step
2. **Song Generation Health** — completed vs failed daily trend, average generation time
3. **Song Engagement** — plays by source, play completions, email submissions, listen page opens
4. **Acquisition** — quiz pageviews, CTA clicks by location

Run with: `POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=... npx tsx scripts/setup-posthog-dashboards.ts`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed quiz_completed property names**
- **Found during:** Task 1, Step 2
- **Issue:** Plan referenced `data.occasion` and `data.voiceType` which don't exist on QuizData
- **Fix:** Used `data.relationshipType` for occasion and `data.voicePreference` for voice
- **Files modified:** src/app/quiz/page.tsx

**2. [Rule 3 - Blocking] BottomCtaSection was a Server Component**
- **Found during:** Task 1, Step 8
- **Issue:** BottomCtaSection had no 'use client' directive, preventing onClick handler
- **Fix:** Added 'use client' directive (component has no server-only logic)
- **Files modified:** src/components/landing/BottomCtaSection.tsx

## Verification

- TypeScript compiles with zero errors in all modified files
- All 10 target files contain analytics instrumentation (confirmed via grep)
- Dashboard script is valid TypeScript and prints clear setup instructions

## Commits

| Task | Commit  | Description                                          |
|------|---------|------------------------------------------------------|
| 1    | 31c349f | Analytics module + full app instrumentation          |
| 2    | e0b27a5 | PostHog dashboard creation script                    |
