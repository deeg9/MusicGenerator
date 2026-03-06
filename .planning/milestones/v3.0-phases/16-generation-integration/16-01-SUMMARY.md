---
phase: 16-generation-integration
plan: "01"
subsystem: backend-api
tags: [quiz, generation, heartmula, tdd, api-route]
dependency_graph:
  requires:
    - "15-quiz-funnel (QuizData types, quiz form)"
    - "src/lib/heartmula.ts (submitGenerationJob)"
    - "src/lib/errors.ts (classifyError, toErrorResponse)"
  provides:
    - "quizToPrompt: QuizData -> SubmitJobParams conversion"
    - "POST /api/quiz-generate endpoint"
  affects:
    - "16-02 (quiz UI wiring to this API)"
    - "16-03 (job polling by jobId)"
tech_stack:
  added: []
  patterns:
    - "TDD red-green cycle for pure conversion function and API route"
    - "Structural lyrics with ACE-Step tags [Verse]/[Chorus]/[Outro]"
    - "Single submitGenerationJob call (batch_size=1, no dual variants)"
    - "Validation-first API: check required fields before calling external service"
key_files:
  created:
    - src/lib/quiz-prompt.ts
    - src/lib/quiz-prompt.test.ts
    - src/app/api/quiz-generate/route.ts
    - src/app/api/quiz-generate/route.test.ts
  modified: []
decisions:
  - "enhancePrompt not called — personal content (name, memories, message) would be stripped by LLM"
  - "lyrics carries all personal content; prompt is genre+mood only (prevents LLM content loss)"
  - "RELATIONSHIP_MOOD maps types to emotional descriptors used in generic prompt"
  - "GENRE_TAG_MAP covers 10 genres; unknown genres fall back to genre.toLowerCase()"
  - "Voice tags are omitted entirely for No Preference — not even a placeholder"
  - "No DB insert in quiz-generate route — Phase 16 validates UX only"
  - "Recipient name fallback to 'you' when empty — graceful lyrics generation"
  - "Memories section ([Verse 2]) only added when non-empty — no blank sections"
metrics:
  duration_minutes: 2
  completed_date: "2026-03-06"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
  tests_added: 41
---

# Phase 16 Plan 01: Quiz Generation Backend Summary

**One-liner:** TDD-built quiz-to-prompt conversion and `/api/quiz-generate` POST endpoint that converts QuizData into a single HeartMuLa generation job with structured ACE-Step lyrics.

## What Was Built

### `src/lib/quiz-prompt.ts`

Pure conversion function that maps `QuizData` to `SubmitJobParams`:

- `quizToPrompt(data: QuizData): SubmitJobParams` — the main export
- `GIFT_SONG_DURATION_MS = 90_000` — 90-second gift songs
- `RELATIONSHIP_MOOD` — maps Mom/Dad/Partner/Friend/Child/Other to emotional mood descriptors
- `GENRE_TAG_MAP` — maps 10 quiz genres to HeartMuLa tag strings (R&B -> "rnb, soul", Classical -> "orchestral, classical", etc.)
- `buildLyrics()` helper — assembles `[Verse]`, `[Chorus]`, `[Outro]` sections; memories section only added when non-empty
- Recipient name fallback to "you" when empty
- `enhancePrompt` intentionally NOT called — prevents LLM stripping of personal content

### `src/app/api/quiz-generate/route.ts`

POST endpoint wiring quiz completion to HeartMuLa:

- Parses JSON body with try/catch (400 on malformed JSON)
- Validates `recipientName` and `genre` as required non-empty fields (400 "Incomplete quiz data")
- Calls `quizToPrompt` then `submitGenerationJob` exactly once (batch_size=1)
- Returns `{ jobId }` with status 201 on success
- Returns 502 with `classifyError` + `toErrorResponse` payload on HeartMuLa failure
- No DB insert, no `enhancePrompt` — pure quiz-to-job handoff

## Test Coverage

41 tests across 2 files:

| File | Tests | Coverage |
|------|-------|----------|
| `quiz-prompt.test.ts` | 27 | GIFT_SONG_DURATION_MS, output shape, prompt purity, lyrics structure/fallbacks, genre mapping (6 genres), voice preference (3 cases) |
| `route.test.ts` | 14 | Happy path, submitGenerationJob call count, quizToPrompt passthrough, validation (4 cases), malformed JSON (2 cases), error handling (3 cases) |

## Deviations from Plan

None — plan executed exactly as written.

Pre-existing TypeScript errors in Phase 15 quiz component test files (`src/app/quiz/_components/*.test.tsx`) were discovered during `tsc --noEmit`. These are out of scope (pre-existing, unrelated files) and logged as deferred.

## Self-Check: PASSED

All created files verified:
- FOUND: `src/lib/quiz-prompt.ts`
- FOUND: `src/lib/quiz-prompt.test.ts`
- FOUND: `src/app/api/quiz-generate/route.ts`
- FOUND: `src/app/api/quiz-generate/route.test.ts`

All commits verified:
- FOUND: `4190a96` (feat(16-01): implement quiz-to-prompt conversion with full test coverage)
- FOUND: `7b99f23` (feat(16-01): implement POST /api/quiz-generate with validation and error handling)
