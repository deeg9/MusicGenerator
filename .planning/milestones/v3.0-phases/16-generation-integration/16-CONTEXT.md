# Phase 16: Generation Integration - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the quiz funnel completion to HeartMuLa song generation. When the user clicks "Create My Song" on the final quiz step, their answers are converted to a HeartMuLa-compatible prompt, a single song is generated (batch_size=1), the user sees an encouraging loading state during the ~7-10s wait, and they are redirected to /quiz/success/[jobId] with the job ID in the URL. The success page itself (playback, download, confetti) is Phase 17.

</domain>

<decisions>
## Implementation Decisions

### Quiz-to-Prompt Conversion
- All decisions delegated to Claude's discretion based on HeartMuLa research:
  - Whether recipient's name appears in lyrics vs prompt-only
  - How qualities, memories, and message map to prompt vs lyrics fields
  - Whether to use enhancePrompt (concern: may strip personal details — research should guide)
  - Song duration default for gift use case
- Genre selection from quiz maps to HeartMuLa `tags` field
- Voice preference (Male/Female/No Preference) maps to HeartMuLa voice parameter if supported

### Loading Experience
- All decisions delegated to Claude's discretion:
  - Whether to personalize loading copy with quiz answers (e.g. "Composing a song for Mom...")
  - Animation style (music-themed vs minimal pulsing)
  - Full-page takeover vs within-card loading state
  - Progress indication approach (fake progress bar vs rotating encouraging copy)
- Must feel warm and gift-like, consistent with brand

### API Route
- All decisions delegated to Claude's discretion:
  - New /api/quiz-generate route vs modifying existing /api/generate
  - Whether to keep the DB record (generations table) or skip for v3.0 simplicity
  - Server-side vs client-side prompt building
  - Client redirect (router.push) vs server redirect
- Single job submission (batch_size=1) — not dual variants (v3.0 locked decision)

### Error Handling & Edge Cases
- All decisions delegated to Claude's discretion:
  - Error display and retry UX on generation failure
  - When to clear quiz data from localStorage
  - Whether /quiz/success/[jobId] polls for completion (vs deferring to Phase 17)
  - Refresh handling during loading state (resume vs re-show quiz)
- Quiz data must be preserved during error states — user should never re-enter answers

### Claude's Discretion
All four areas were delegated to Claude's judgment. Key constraints:
- Single song (batch_size=1) — locked v3.0 decision
- Use `heartmula.ts` exports (submitGenerationJob, enhancePrompt, queryJobStatus) — don't bypass
- `QuizData` type from `src/lib/quiz-types.ts` is the input contract
- Loading state must feel warm and encouraging, not clinical
- Job ID must end up in URL at /quiz/success/[jobId] for Phase 17

</decisions>

<specifics>
## Specific Ideas

- Quiz-to-prompt conversion is the highest-risk unknown (noted in STATE.md blockers) — the research phase should investigate how HeartMuLa handles personal content in prompts vs lyrics
- The loading state is a key emotional moment — user just poured their heart out in the quiz, now they're waiting for their gift to be created. This should feel magical, not transactional
- Email from Step 6 is lead capture only in v3.0 — no email notification needs to be sent during generation

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `heartmula.ts`: Full API client with `submitGenerationJob`, `enhancePrompt`, `queryJobStatus`, `fetchAudioBuffer` — all typed and working
- `quiz-types.ts`: `QuizData` interface + `INITIAL_QUIZ_DATA` — shared contract from Phase 15
- `/api/generate/route.ts`: Existing generation route with validation, error handling, DB insert pattern — can be referenced or adapted
- `/api/status/route.ts`: Existing status polling endpoint — may be reusable for Phase 17
- `framer-motion` (v12.35): Available for loading animations
- `errors.ts`: `classifyError` + `toErrorResponse` — error handling utilities

### Established Patterns
- API routes use NextRequest/NextResponse with structured error responses
- HeartMuLa uses async polling: submit job → get job_id → poll status → download audio
- `env.ts` provides validated environment variables including HEARTMULA_URL
- Drizzle ORM with `generations` table for job tracking

### Integration Points
- Quiz page (`src/app/quiz/page.tsx`): "Create My Song" button currently logs to console — Phase 16 wires this to API call
- `/quiz/success/[jobId]` route: New dynamic route — Phase 16 creates the route, Phase 17 builds it out
- localStorage key `notevra_quiz_v1`: Quiz data stored here — generation flow reads from quiz state (passed via props/state, not re-read from localStorage)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-generation-integration*
*Context gathered: 2026-03-06*
