---
phase: quick-7
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/analytics.ts
  - src/app/quiz/page.tsx
  - src/app/quiz/success/[jobId]/page.tsx
  - src/app/quiz/success/[jobId]/_components/SongPlayer.tsx
  - src/app/quiz/success/[jobId]/_components/RecipientEmailForm.tsx
  - src/app/quiz/success/[jobId]/_components/SharePrompt.tsx
  - src/app/listen/[songId]/ListenPlayer.tsx
  - src/app/page.tsx
  - src/components/landing/HeroSection.tsx
  - src/components/landing/BottomCtaSection.tsx
  - src/app/providers.tsx
autonomous: true
requirements: [ANALYTICS-INSTRUMENTATION, POSTHOG-DASHBOARDS]
must_haves:
  truths:
    - "Quiz funnel events fire with step metadata on every step transition"
    - "Song generation lifecycle events fire (started, completed, failed)"
    - "Song engagement events fire (played, completed, shared, downloaded, email sent)"
    - "Landing page CTA clicks are tracked with location context"
    - "PostHog identify is called when auth state is available"
  artifacts:
    - path: "src/lib/analytics.ts"
      provides: "Centralized analytics helper with typed event functions"
      exports: ["trackQuizStarted", "trackQuizStepCompleted", "trackQuizStepBack", "trackQuizCompleted", "trackSongGenerationStarted", "trackSongGenerationCompleted", "trackSongGenerationFailed", "trackSongPlayed", "trackSongPlayCompleted", "trackEmailFormSubmitted", "trackListenPageOpened", "trackSongShared", "trackSongDownloaded", "trackCtaClicked", "identifyUser"]
    - path: "src/app/quiz/page.tsx"
      provides: "Quiz funnel event instrumentation"
    - path: "src/app/quiz/success/[jobId]/page.tsx"
      provides: "Generation lifecycle event instrumentation"
  key_links:
    - from: "src/lib/analytics.ts"
      to: "posthog-js"
      via: "import posthog from posthog-js"
      pattern: "posthog\\.capture"
    - from: "src/app/quiz/page.tsx"
      to: "src/lib/analytics.ts"
      via: "import { trackQuizStarted, trackQuizStepCompleted }"
      pattern: "trackQuiz"
---

<objective>
Add comprehensive PostHog custom event tracking across the Notevra app and create dashboards for funnel analysis, generation health, and engagement metrics.

Purpose: Enable data-driven product decisions by tracking the full user journey from landing page through quiz, generation, and song delivery/engagement.
Output: Centralized analytics module with typed event helpers, instrumented across all key touchpoints, plus PostHog dashboards.
</objective>

<execution_context>
@/Users/deeg/.claude/get-shit-done/workflows/execute-plan.md
@/Users/deeg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/app/providers.tsx
@src/app/PostHogPageView.tsx
@src/app/quiz/page.tsx
@src/app/quiz/success/[jobId]/page.tsx
@src/app/quiz/success/[jobId]/_components/SongPlayer.tsx
@src/app/quiz/success/[jobId]/_components/RecipientEmailForm.tsx
@src/app/quiz/success/[jobId]/_components/SharePrompt.tsx
@src/app/listen/[songId]/page.tsx
@src/app/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create analytics module and instrument all app touchpoints</name>
  <files>
    src/lib/analytics.ts,
    src/app/quiz/page.tsx,
    src/app/quiz/success/[jobId]/page.tsx,
    src/app/quiz/success/[jobId]/_components/SongPlayer.tsx,
    src/app/quiz/success/[jobId]/_components/RecipientEmailForm.tsx,
    src/app/quiz/success/[jobId]/_components/SharePrompt.tsx,
    src/app/listen/[songId]/ListenPlayer.tsx,
    src/components/landing/HeroSection.tsx,
    src/components/landing/BottomCtaSection.tsx,
    src/app/providers.tsx
  </files>
  <action>
**Step 1: Create `src/lib/analytics.ts`** — a centralized analytics helper module that wraps `posthog.capture()` with typed functions. This keeps event names and property shapes in one place, prevents typos, and makes future changes easy. Import `posthog from 'posthog-js'` directly (it's already initialized in providers.tsx).

Define these exported functions (each calls `posthog.capture(eventName, properties)`):

```
// Quiz Funnel
trackQuizStarted() — event: 'quiz_started'
trackQuizStepCompleted(stepNumber: number, stepName: string, timeOnStepMs: number) — event: 'quiz_step_completed', props: { step_number, step_name, time_on_step_ms }
trackQuizStepBack(fromStep: number, fromStepName: string) — event: 'quiz_step_back', props: { from_step, from_step_name }
trackQuizCompleted(data: { totalTimeMs: number; occasion: string; genre: string; voice: string; language: string }) — event: 'quiz_completed'

// Song Generation
trackSongGenerationStarted(jobId: string, songId: string) — event: 'song_generation_started'
trackSongGenerationCompleted(songId: string, generationTimeMs: number) — event: 'song_generation_completed'
trackSongGenerationFailed(errorType: string) — event: 'song_generation_failed'

// Engagement
trackSongPlayed(songId: string, source: 'success_page' | 'listen_page' | 'dashboard') — event: 'song_played'
trackSongPlayCompleted(songId: string, source: string) — event: 'song_play_completed'
trackEmailFormSubmitted(songId: string) — event: 'email_form_submitted'
trackListenPageOpened(songId: string) — event: 'listen_page_opened'
trackSongShared(songId: string) — event: 'song_shared'
trackSongDownloaded(songId: string) — event: 'song_downloaded'

// Acquisition
trackCtaClicked(ctaLocation: string, ctaText: string) — event: 'cta_clicked'

// Identity
identifyUser(userId: string, properties?: Record<string, unknown>) — calls posthog.identify(userId, properties)
```

**Step 2: Instrument quiz page (`src/app/quiz/page.tsx`)**:
- Add a `useRef` for `quizStartTime` (set to `Date.now()` on mount) and `stepStartTime` (reset each step change).
- Add a `STEP_NAMES` array: `['relationship', 'genre_voice', 'qualities', 'memories', 'message', 'language']`.
- In mount `useEffect`: call `trackQuizStarted()`.
- In `goNext()`: before incrementing step, call `trackQuizStepCompleted(currentStep + 1, STEP_NAMES[currentStep], Date.now() - stepStartTimeRef.current)`, then reset `stepStartTimeRef.current = Date.now()`. On final step (before `handleCreate()`), also call `trackQuizCompleted({ totalTimeMs: Date.now() - quizStartTimeRef.current, occasion: data.occasion, genre: data.genre, voice: data.voiceType, language: data.language })`.
- In `goBack()`: call `trackQuizStepBack(currentStep + 1, STEP_NAMES[currentStep])`.
- IMPORTANT: Add `trackQuizStarted` to the SAME `useEffect` that loads from localStorage, but fire it AFTER the load. Use a separate `useEffect` with empty deps that fires once — quiz_started means the quiz page loaded, regardless of whether data was restored.

**Step 3: Instrument success page (`src/app/quiz/success/[jobId]/page.tsx`)**:
- When generation job is submitted (the page loads with polling): call `trackSongGenerationStarted(jobId, songId)` on mount.
- When polling resolves to COMPLETED: call `trackSongGenerationCompleted(songId, elapsedMs)` where elapsedMs is time since page mount.
- When polling resolves to FAILED: call `trackSongGenerationFailed(errorType)`.
- When download button is clicked: call `trackSongDownloaded(songId)`.

**Step 4: Instrument SongPlayer (`src/app/quiz/success/[jobId]/_components/SongPlayer.tsx`)**:
- Accept an optional `songId` prop and optional `source` prop (default: 'success_page').
- On play button click: call `trackSongPlayed(songId, source)` (only on first play or when resuming from beginning).
- On audio `ended` event: call `trackSongPlayCompleted(songId, source)`.

**Step 5: Instrument RecipientEmailForm**:
- On successful form submission (after fetch resolves 200): call `trackEmailFormSubmitted(songId)`.

**Step 6: Instrument SharePrompt**:
- On copy link click: call `trackSongShared(songId ?? '')`. SharePrompt needs a `songId` prop — add it to the interface and pass from parent.

**Step 7: Instrument ListenPlayer** (in `/listen/[songId]/`):
- The listen page is a Server Component, so add `trackListenPageOpened(songId)` in the client ListenPlayer component's mount useEffect.
- Also add `trackSongPlayed` and `trackSongPlayCompleted` like the success page SongPlayer. Accept songId prop.

**Step 8: Instrument landing page CTAs**:
- In `HeroSection.tsx`: wrap the main CTA Link/button's onClick to call `trackCtaClicked('hero', 'Create a Song')` (read the actual CTA text from the component).
- In `BottomCtaSection.tsx`: same pattern with `trackCtaClicked('bottom_cta', '...')`.
- These are likely Server Components with Link elements. If so, create a tiny `'use client'` wrapper `CtaLink` component inline or add an onClick via a client wrapper. The simplest approach: if the CTA is already a Link, wrap it in a client component that adds onClick tracking before navigation.

**Step 9: Add posthog.identify() in providers.tsx**:
- In the `PostHogProvider` component, add a `useEffect` that checks Supabase auth state via `createClient().auth.getUser()`. If user exists, call `identifyUser(user.id, { email: user.email, name: user.user_metadata?.full_name })`. Run this once on mount.
- Import `createClient` from `@/lib/supabase/client`.

**Do NOT:**
- Modify test files in this task — existing tests should still pass since we're only adding side-effect calls.
- Add any UI changes — all tracking is invisible to the user.
- Import posthog directly in components — always use the analytics.ts helpers.
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    - src/lib/analytics.ts exists with all typed event helpers exported
    - Quiz page fires quiz_started on mount, quiz_step_completed on each next, quiz_step_back on back, quiz_completed on final step
    - Success page fires song_generation_started/completed/failed lifecycle events
    - SongPlayer fires song_played and song_play_completed
    - RecipientEmailForm fires email_form_submitted on success
    - SharePrompt fires song_shared on copy
    - ListenPlayer fires listen_page_opened on mount and play events
    - Landing CTAs fire cta_clicked with location
    - providers.tsx calls posthog.identify() for authenticated users
    - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Create PostHog dashboards and insights via API</name>
  <files>scripts/setup-posthog-dashboards.ts</files>
  <action>
Create a one-time setup script `scripts/setup-posthog-dashboards.ts` that creates PostHog dashboards and insights via the PostHog API. This script will be run once manually.

**Use the PostHog API** (https://us.posthog.com/api/ or the host from NEXT_PUBLIC_POSTHOG_HOST env var):
- Auth: Personal API key from `POSTHOG_PERSONAL_API_KEY` env var
- Project ID: from `POSTHOG_PROJECT_ID` env var (or parse from the PostHog init)

The script should use `fetch()` directly (no extra deps). Run with `npx tsx scripts/setup-posthog-dashboards.ts`.

**Create these dashboards with insights:**

1. **Quiz Funnel Conversion** dashboard:
   - Funnel insight: `quiz_started` -> `quiz_step_completed` (step_number=1) -> ... -> `quiz_completed` (breakdown by step)
   - Trend insight: `quiz_completed` count over time (daily)
   - Trend insight: Average `time_on_step_ms` by `step_name`

2. **Song Generation Health** dashboard:
   - Trend insight: `song_generation_completed` vs `song_generation_failed` counts (daily)
   - Trend insight: Average `generation_time_ms` from `song_generation_completed` (daily)

3. **Song Engagement** dashboard:
   - Trend insight: `song_played` count by `source` breakdown (daily)
   - Trend insight: `song_play_completed` count (daily) — play-through rate
   - Trend insight: `email_form_submitted` count (daily)
   - Trend insight: `listen_page_opened` count (daily)

4. **Acquisition** dashboard:
   - Trend insight: `$pageview` count for URL containing `/quiz` (daily)
   - Trend insight: `cta_clicked` count by `cta_location` breakdown (daily)

For each dashboard, the script should:
1. Create the dashboard via `POST /api/projects/{id}/dashboards/`
2. Create each insight via `POST /api/projects/{id}/insights/` with the dashboard ID
3. Log created dashboard URLs

Use PostHog's query format for insights:
- Funnel: `{ insight: 'FUNNELS', events: [...], funnel_order_type: 'sequential' }`
- Trends: `{ insight: 'TRENDS', events: [...], interval: 'day' }`

Print setup instructions at the start (what env vars are needed, where to get personal API key from PostHog settings).

**Do NOT:**
- Run the script automatically — it requires manual env var setup
- Add PostHog personal API key to .env.local — it's for one-time use only
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit scripts/setup-posthog-dashboards.ts 2>&1 || echo "Checking file exists..." && test -f scripts/setup-posthog-dashboards.ts && echo "Script exists" && head -5 scripts/setup-posthog-dashboards.ts</automated>
  </verify>
  <done>
    - scripts/setup-posthog-dashboards.ts exists and is valid TypeScript
    - Script creates 4 dashboards with relevant insights when run
    - Script prints clear instructions for required env vars
    - Script logs created dashboard URLs on success
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (no type errors from new analytics code)
- `grep -r "trackQuiz\|trackSong\|trackCta\|trackEmail\|trackListen\|identifyUser" src/` shows instrumentation across all target files
- `src/lib/analytics.ts` exports all event helpers
- `scripts/setup-posthog-dashboards.ts` exists and is syntactically valid
</verification>

<success_criteria>
- All custom PostHog events are instrumented across the app with typed helpers
- Quiz funnel tracks every step transition with timing data
- Song generation lifecycle is fully tracked (started/completed/failed)
- Engagement events cover play, share, download, email, listen page
- Landing CTAs are tracked with location context
- Authenticated users are identified in PostHog
- Dashboard creation script is ready to run
</success_criteria>

<output>
After completion, create `.planning/quick/7-research-and-set-up-posthog-dashboards-a/7-SUMMARY.md`
</output>
