---
phase: quick
plan: 260324-w5x
subsystem: quiz
tags: [genres, voice, ui, quiz, tags, heartmula]
dependency_graph:
  requires: []
  provides: [expanded-genre-options, duet-choir-voice, energy-selector, instrumental-toggle]
  affects: [quiz-step-2, homepage-genre-dropdown, heartmula-tags]
tech_stack:
  added: []
  patterns: [pill-button-toggle, toggle-switch, conditional-dimming]
key_files:
  created: []
  modified:
    - src/lib/genres.ts
    - src/lib/quiz-types.ts
    - src/lib/quiz-prompt.ts
    - src/lib/quiz-prompt.test.ts
    - src/app/quiz/_components/Step2GenreVoice.tsx
    - src/app/quiz/_components/Step2GenreVoice.test.tsx
decisions:
  - "GENRE_TAG_MAP gets R&B / Soul and Folk / Acoustic aliases alongside the existing R&B and Folk keys — quiz genre IDs use the longer display names"
  - "Instrumental flag takes priority over voice preference in buildTags — when instrumental is true, no voice tags are emitted regardless of voicePreference value"
  - "Energy deselection supported — clicking the already-selected energy pill calls updateData({ energy: '' }) to clear it"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-24"
  tasks_completed: 3
  files_modified: 6
---

# Quick Task 260324-w5x: Add 8 New Genres, Duet/Choir Voice, Energy Selector, Instrumental Toggle

One-liner: Expanded quiz Step 2 with 15 genres (8 new), Duet/Choir voice options, Low/Medium/High energy pills, and an instrumental toggle — all wired through to HeartMuLa tags.

## What Was Built

### Task 1: Data layer expansion
- `src/lib/genres.ts` — Added 8 genres: Jazz, Electronic, Latin, Reggae, Blues, Gospel, Indie, Lullaby (15 total)
- `src/lib/quiz-types.ts` — Expanded `VoicePreference` to include `'Duet' | 'Choir'`; added `energy: 'low' | 'medium' | 'high' | ''` and `instrumental: boolean` fields to `QuizData` and `INITIAL_QUIZ_DATA`
- `src/lib/quiz-prompt.ts` — Added GENRE_TAG_MAP entries for 5 new genres plus display-name aliases; updated `buildTags()` to handle Duet, Choir, instrumental override, and energy descriptors; updated `formatQuizForGemini()` to include Energy and Instrumental lines

### Task 2: Step 2 UI rebuild
- `src/app/quiz/_components/Step2GenreVoice.tsx` — Genre grid updated to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`; VOICE_OPTIONS expanded to 5 entries; Energy level section added with Low/Medium/High PillButtons (deselectable toggle behavior); Instrumental toggle switch added with animated sliding dot; voice section conditionally dimmed (`opacity-50 pointer-events-none`) when instrumental is enabled

### Task 3: Test coverage
- `src/app/quiz/_components/Step2GenreVoice.test.tsx` — Updated genre count test to verify all 15 genres; added tests for 5 voice pills, energy selector behavior, deselection, instrumental toggle rendering and click
- `src/lib/quiz-prompt.test.ts` — Updated BASE_QUIZ fixture with new required fields; added tests for new genre tag mappings (Reggae, Blues, Gospel, Indie, Lullaby), Duet/Choir voice tags, instrumental override behavior, and all three energy levels

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | 3be27bf | feat(quick-260324-w5x): expand data layer — 15 genres, Duet/Choir voice, energy and instrumental fields |
| 2 | b5ec12f | feat(quick-260324-w5x): update Step 2 UI — 15 genres, 5 voice pills, energy selector, instrumental toggle |
| 3 | 5c45d6b | test(quick-260324-w5x): add test coverage for new genres, Duet/Choir, energy, and instrumental |

## Test Results

All 50 tests pass (run from worktree directory where `@/` alias resolves to worktree `src/`):
- `src/lib/quiz-prompt.test.ts`: 36 tests pass (27 existing + 9 new)
- `src/app/quiz/_components/Step2GenreVoice.test.tsx`: 10 tests pass (5 existing updated + 5 new)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added GENRE_TAG_MAP aliases for display-name genre IDs**
- **Found during:** Task 1
- **Issue:** Existing GENRE_TAG_MAP used short keys (`R&B`, `Folk`) but quiz genre IDs are `R&B / Soul` and `Folk / Acoustic` — unmapped genres fell back to lowercase, producing incorrect tags like `r&b / soul` instead of `rnb, soul`
- **Fix:** Added `'R&B / Soul': 'rnb, soul'` and `'Folk / Acoustic': 'folk, acoustic'` alongside the existing short-form keys
- **Files modified:** src/lib/quiz-prompt.ts
- **Commit:** 3be27bf

## Known Stubs

None — all new options are fully wired through to HeartMuLa tag output.

## Self-Check: PASSED

Files exist:
- src/lib/genres.ts — FOUND
- src/lib/quiz-types.ts — FOUND
- src/lib/quiz-prompt.ts — FOUND
- src/lib/quiz-prompt.test.ts — FOUND
- src/app/quiz/_components/Step2GenreVoice.tsx — FOUND
- src/app/quiz/_components/Step2GenreVoice.test.tsx — FOUND

Commits exist:
- 3be27bf — FOUND
- b5ec12f — FOUND
- 5c45d6b — FOUND
