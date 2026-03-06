# Phase 19: Error Boundaries and API Hardening - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Graceful error handling across the Notevra application. Users see recovery UI instead of page crashes or infinite spinners. API routes return structured JSON errors instead of stack traces. Covers error boundaries at route level, API response hardening, and timeout/retry UX improvements on the success page.

</domain>

<decisions>
## Implementation Decisions

### Error boundary placement and behavior
- Add `error.tsx` at `/quiz` and `/quiz/success` routes — these are the interactive routes where crashes matter
- Landing page is mostly static with low crash risk — no error boundary needed there
- Recovery action: "Try again" button calls `reset()` to re-render the crashed route segment
- If retry also fails, fall back to a "Go home" link

### Error boundary visual style
- Match the existing error/timeout states on the success page: yellow-100 circle icon, warm copy, rounded card layout
- Consistent with the baby blue + mellow yellow brand identity
- Warm + casual tone matching existing copy (e.g., "Something went wrong, but your progress is safe")

### API error response shape
- All API routes (quiz-generate, poll-job, audio) use the same `classifyError` + `toErrorResponse` pattern from `src/lib/errors.ts`
- Consistent contract: `{error: {category, retryable, userMessage}, debug: {technicalMessage}}`
- Strip `debug.technicalMessage` in production (`NODE_ENV === 'production'`) to prevent information leakage

### Poll-job error granularity
- Distinguish between "job not found" (404) and "pod unreachable" (502) instead of silently returning QUEUED for all errors
- Keep silent-QUEUED fallback only for transient network blips (fetch failures)
- Invalid jobId returns 404 with structured JSON error

### Audio route error handling
- Return JSON `{error: ...}` with appropriate status code when audio isn't found or R2 fails
- Client already handles non-audio responses by checking content-type

### Timeout behavior
- Keep 2-minute timeout (POLL_TIMEOUT_MS = 120000) — generous threshold covers cold-start scenarios
- On timeout: show two buttons — "Check Again" (re-polls same jobId) and "Start Over" (back to quiz)
- After 15 seconds of loading, swap subtitle to "Still working on it..." to reassure users it hasn't frozen (no elapsed timer — that creates anxiety)

### Error state differentiation
- Differentiate "song failed" (retryable — "Try Again" button) vs "pod down" (not retryable — "Our servers are temporarily offline. Please try again later.")
- Different messages and actions for different problem types

### Claude's Discretion
- Exact error boundary component structure and reset logic
- How to detect pod-down vs song-failed in the client (likely from poll-job's structured error response)
- Whether to add error logging/reporting hooks

</decisions>

<specifics>
## Specific Ideas

- Error boundary copy should match existing tone: "Our music AI had a hiccup" style — warm, not clinical
- "Check Again" button on timeout should re-enter the polling loop for the same jobId without navigating away
- Reassurance message ("Still working on it...") should appear after 15s without any jarring visual change — just a subtitle text swap

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/errors.ts`: Mature error classification system with `classifyError()` and `toErrorResponse()` — already used by quiz-generate
- Success page (`src/app/quiz/success/[jobId]/page.tsx`): Already has `error` and `timeout` PageState variants with recovery UI — can be enhanced rather than rebuilt
- `src/app/api/quiz-generate/route.ts`: Reference implementation of structured error responses

### Established Patterns
- Error responses use `{error: {category, retryable, userMessage}, debug: {technicalMessage}}` shape
- `classifyError` handles timeout, network, model, input, and rate-limit categories
- Quiz data persisted in localStorage (`notevra_quiz_v1`) — survives page crashes

### Integration Points
- `src/app/quiz/error.tsx` — new file, Next.js error boundary for quiz routes
- `src/app/quiz/success/error.tsx` — new file, error boundary for success route
- `src/app/api/poll-job/[jobId]/route.ts` — needs error handling overhaul (currently swallows all errors)
- `src/app/api/audio/[key]/route.ts` — needs structured error responses added

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 19-error-boundaries-and-api-hardening*
*Context gathered: 2026-03-06*
