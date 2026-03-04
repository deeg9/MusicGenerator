---
phase: 01-infrastructure-foundation
plan: 03
subsystem: api
tags: [next.js, api-routes, drizzle-orm, cloudflare-r2, runpod, ace-step, typescript]

# Dependency graph
requires:
  - phase: 01-infrastructure-foundation/01-01
    provides: RunPod client, R2 client, error classification, Drizzle schema + DB client
  - phase: 01-infrastructure-foundation/01-02
    provides: ACE-Step API behavioral findings (response envelope, POST query_result, empty data edge case)
provides:
  - POST /api/generate — submits ACE-Step generation job, inserts DB record, returns jobId (201)
  - GET /api/status/[jobId] — single RunPod poll per call, uploads audio to R2 on success, structured error on failure
  - GET /api/audio/[key] — returns presigned R2 URL for audio download (1hr expiry)
  - Consistent error response format across all routes: category, retryable, message, technical
affects:
  - 02-ui (frontend calls these routes for generation flow)
  - 03-auth (auth middleware will wrap these routes)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Next.js App Router route handlers with async params (params: Promise<{...}>)
    - Single-shot RunPod poll per request — no blocking loops in route handlers
    - Terminal state caching — completed/failed generations return from DB without RunPod calls
    - Drizzle InferSelectModel for type-safe query result handling
    - URL-encoded R2 key routing via decodeURIComponent in [key] segment

key-files:
  created:
    - src/app/api/generate/route.ts
    - src/app/api/status/[jobId]/route.ts
    - src/app/api/audio/[key]/route.ts
  modified: []

key-decisions:
  - "Always generate 2 variants (batchSize=2) regardless of client request — simplifies frontend"
  - "ACE-Step query_result returns empty data for completed jobs — log warning, still mark completed"
  - "Partial audio upload success acceptable — log failed variants, continue with remaining"
  - "RunPod poll timeout returns current DB state unchanged — do NOT mark as failed on timeout"
  - "DB insert failure after job submission returns 500 (unretryable) — job running on RunPod but reference lost"

patterns-established:
  - "Pattern: Route handlers make single external call and return immediately — never poll in a loop"
  - "Pattern: Terminal states (completed/failed) served from DB cache — no RunPod calls"
  - "Pattern: Consistent error JSON format: {error: {category, retryable, message, technical}}"
  - "Pattern: InferSelectModel<typeof table> for Drizzle query type inference"

requirements-completed:
  - INFRA-02
  - INFRA-03

# Metrics
duration: 10min
completed: 2026-03-04
---

# Phase 1 Plan 03: API Routes Summary

**Three async generation pipeline API routes: POST /api/generate submits ACE-Step jobs, GET /api/status/[jobId] polls RunPod once per call and uploads audio to R2, GET /api/audio/[key] returns presigned R2 URLs — all with structured dual-layer error responses**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-04T20:40:46Z
- **Completed:** 2026-03-04T20:50:46Z
- **Tasks:** 1 of 2 (Task 2 is human-verify checkpoint — awaiting end-to-end verification)
- **Files modified:** 3

## Accomplishments

- POST /api/generate validates input (prompt required, duration 30-240s), submits job to ACE-Step via `submitGenerationJob`, inserts generation record in DB, returns `{jobId, status: "pending"}` with 201 — no blocking
- GET /api/status/[jobId] makes one RunPod poll per request, handles all three status codes (0=running, 1=succeeded, 2=failed), downloads audio and uploads to R2 on completion, classifies errors on failure, caches terminal states in DB
- GET /api/audio/[key] decodes URL-encoded R2 key, generates presigned URL (1hr expiry), returns 404 on missing key vs 500 on R2 error
- `npm run build` succeeds and `npx tsc --noEmit` passes with zero errors
- Handles known ACE-Step edge case: `query_result` returning empty data despite job success (logs warning, marks completed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build generation submit, status polling, and audio retrieval API routes** - `a57087e` (feat)

**Plan metadata:** _(pending after Task 2 verification completes)_

## Files Created/Modified

- `src/app/api/generate/route.ts` - POST endpoint: validates input, submits to ACE-Step, inserts DB record, returns 201 with jobId
- `src/app/api/status/[jobId]/route.ts` - GET endpoint: single RunPod poll, R2 upload on completion, structured error on failure, DB caching for terminal states
- `src/app/api/audio/[key]/route.ts` - GET endpoint: URL-decodes R2 key, returns presigned URL with 1hr expiry

## Decisions Made

- **Always 2 variants:** `batchSize` hardcoded to 2 in generate route — simplifies frontend which always shows 2 options
- **ACE-Step empty data edge case:** `query_result` is known to return `{"data": []}` even for completed jobs (discovered in Plan 01-02). Route handles this by marking completed and logging a warning — audio upload path is skipped when `audio_urls` is empty. This may need revisiting once the actual audio retrieval mechanism via `/v1/audio?path=` is understood
- **Timeout doesn't mean failure:** When RunPod poll times out (AbortError), current DB state is returned unchanged — do NOT mark as failed. Client continues polling next time
- **Partial audio success:** If uploading audio variants fails for some indices, continue with remaining ones — partial results are better than none
- **Next.js App Router async params:** Route params in Next.js 16 are `Promise<{...}>` — must `await params` before destructuring

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Next.js 16 async params pattern for route handlers**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Next.js 16 App Router route handlers use `params: Promise<{...}>` (async) — accessing params directly without awaiting causes TypeScript errors and runtime issues
- **Fix:** Changed all route handlers to `{ params }: { params: Promise<{ ... }> }` and added `const { key } = await params;` before use
- **Files modified:** `src/app/api/status/[jobId]/route.ts`, `src/app/api/audio/[key]/route.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** a57087e (Task 1 commit)

**2. [Rule 1 - Bug] Fixed Drizzle findFirst with relations type inference**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** `db.query.generations.findFirst({ with: { outputs: true } })` returns inferred type without `outputs` property visible to TypeScript — caused `Property 'outputs' does not exist` error
- **Fix:** Added `GenerationWithOutputs` interface extending `InferSelectModel<typeof generations>` with `outputs: Output[]`, cast the `findFirst` result to this type
- **Files modified:** `src/app/api/status/[jobId]/route.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** a57087e (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs — both TypeScript correctness issues)
**Impact on plan:** Both fixes required for type safety and correct runtime behavior. No scope creep — no features added beyond the plan.

## Issues Encountered

- ACE-Step `query_result` returns empty data (`{"data": []}`) for completed jobs — documented in MEMORY.md from Plan 01-02 investigation. The status route handles this gracefully by logging a warning and marking the generation as completed. The actual audio delivery mechanism via `GET /v1/audio?path=` requires further investigation to implement full R2 upload flow.

## User Setup Required

None — no new environment variables or external service configuration required beyond what Plan 01-02 established.

## Next Phase Readiness

- All three API routes compiled and building correctly
- Ready for human end-to-end verification (Task 2 checkpoint)
- After verification: Phase 1 complete, ready for Phase 2 (UI)
- Open question: ACE-Step `audio_urls` not returned in `query_result` — may need to query `/v1/stats` or investigate another result delivery mechanism before audio upload flow works end-to-end

---
*Phase: 01-infrastructure-foundation*
*Completed: 2026-03-04*

## Self-Check: PASSED

Files verified present:
- FOUND: src/app/api/generate/route.ts
- FOUND: src/app/api/status/[jobId]/route.ts
- FOUND: src/app/api/audio/[key]/route.ts
- FOUND: 01-03-SUMMARY.md

Commits verified:
- FOUND: a57087e (Task 1 — feat(01-03): build generation submit, status polling, and audio retrieval API routes)
