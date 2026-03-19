---
phase: quick-14
plan: "01"
subsystem: homepage-conversion
tags: [homepage, chat-box, genre, localStorage, routing, quiz]
dependency_graph:
  requires: []
  provides: [HomepageChatBox, GENRE_OPTIONS shared module, HOMEPAGE_INPUT_KEY]
  affects: [src/components/landing/HeroSection.tsx, src/app/quiz/page.tsx]
tech_stack:
  added: []
  patterns: [localStorage cache-and-consume, auth-gated routing, shared constants module]
key_files:
  created:
    - src/lib/genres.ts
    - src/components/landing/HomepageChatBox.tsx
  modified:
    - src/lib/quiz-types.ts
    - src/app/quiz/_components/Step2GenreVoice.tsx
    - src/components/landing/HeroSection.tsx
    - src/app/quiz/page.tsx
decisions:
  - "GENRE_OPTIONS extracted to src/lib/genres.ts as single source of truth — Step2GenreVoice and HomepageChatBox both import from there"
  - "HomepageChatBox routes to /signup?next=/quiz for unauthenticated users, /quiz for authenticated — consistent with existing quiz auth gate pattern"
  - "Homepage input consumed once on quiz mount (removeItem immediately) — prevents stale data re-applying on refresh"
  - "Quiz restore runs before homepage input read — homepage data does not override in-progress quiz answers"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-19T16:24:06Z"
  tasks: 3
  files: 6
---

# Quick Task 14: Homepage Chat Box with Genre Dropdown Summary

**One-liner:** Chat-style textarea + genre dropdown on homepage that caches input to localStorage and routes users to quiz (or signup if logged out), with quiz pre-fill on arrival.

## What Was Built

A homepage conversion widget that reduces friction to the first meaningful quiz action. Users can describe their song idea and pick a genre directly on the landing page before they even start the quiz.

### Components and Files

**`src/lib/genres.ts`** (new)
Single source of truth for `GenreOption` type and `GENRE_OPTIONS` array (7 genres: Pop, R&B / Soul, Folk / Acoustic, Rock, Hip-Hop, Classical, Country).

**`src/components/landing/HomepageChatBox.tsx`** (new)
Client component with:
- 3-row textarea with placeholder "What do you want this song to be about..."
- Genre dropdown (bottom-left) showing genre label + mood subtitle per option
- Send button (bottom-right) — circular, `bg-primary`
- Outside-click detection closes dropdown via `mousedown` listener
- Validation: shows "Tell us about your song idea" if prompt empty on send
- On send: writes `{ prompt, genre }` to `localStorage[HOMEPAGE_INPUT_KEY]`, checks auth, routes to `/quiz` (logged in) or `/signup?next=/quiz` (logged out)

**`src/lib/quiz-types.ts`** (modified)
Added `HOMEPAGE_INPUT_KEY = 'notevra_homepage_input'` and `HomepageInput { prompt: string; genre: string }` interface after `INITIAL_QUIZ_DATA`.

**`src/app/quiz/_components/Step2GenreVoice.tsx`** (modified)
Removed local `GENRE_OPTIONS` constant, now imports from `@/lib/genres`.

**`src/components/landing/HeroSection.tsx`** (modified)
Added `<HomepageChatBox />` in Left Column after the `<h1>` heading and before the video player.

**`src/app/quiz/page.tsx`** (modified)
In the first `useEffect` (localStorage restore), added a second `try/catch` block after quiz restore that:
1. Reads `HOMEPAGE_INPUT_KEY` from localStorage
2. Removes it immediately (consumed once)
3. Calls `setData` to pre-fill `genre` (if empty) and `memories` (if empty) from homepage input
4. Does NOT override existing quiz data from in-progress sessions

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 4d5bb50 | Extract GENRE_OPTIONS to shared module + add HOMEPAGE_INPUT_KEY |
| 2 | 71559c3 | Create HomepageChatBox component and integrate into HeroSection |
| 3 | 0799c25 | Quiz page reads and consumes homepage input on mount |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `src/lib/genres.ts` exists and exports `GENRE_OPTIONS`
- [x] `src/components/landing/HomepageChatBox.tsx` exists (>60 lines)
- [x] `src/lib/quiz-types.ts` exports `HOMEPAGE_INPUT_KEY` and `HomepageInput`
- [x] `Step2GenreVoice.tsx` imports from `@/lib/genres`
- [x] `HeroSection.tsx` renders `<HomepageChatBox />`
- [x] `quiz/page.tsx` reads and removes `HOMEPAGE_INPUT_KEY` on mount
- [x] All 3 commits exist: 4d5bb50, 71559c3, 0799c25
- [x] TypeScript: no new errors introduced in changed source files
