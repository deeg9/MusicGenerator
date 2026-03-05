---
phase: 02-generation-api
plan: 01
subsystem: api
tags: [runpod, ace-step, format_input, llm, bpm, next.js]

# Dependency graph
requires:
  - phase: 01-infrastructure-foundation
    provides: submitGenerationJob, classifyError, env.RUNPOD_URL, /api/generate route
provides:
  - callFormatInput() function in src/lib/runpod.ts with FormatInputParams and FormatInputResult types
  - /api/generate route that calls format_input before job submission with graceful fallback
  - enhancedCaption field in generate response for frontend display
affects: [02-generation-api, frontend generation form]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ACE-Step response envelope unwrapping (raw.data, raw.error)
    - Graceful degradation: try format_input, catch all errors, fall back to raw prompt
    - Defensive field name handling for ACE-Step snake_case / camelCase variants

key-files:
  created: []
  modified:
    - src/lib/runpod.ts
    - src/app/api/generate/route.ts

key-decisions:
  - "format_input called with genre tags concatenated into prompt string — produces better musical metadata"
  - "Graceful fallback: format_input failure is non-fatal, generation continues with raw prompt"
  - "Defensive keyscale/keyScale and timesignature/timeSignature field handling — ACE-Step API uses inconsistent casing"
  - "enhancedCaption returned in 201 response so frontend can display the structured caption"

patterns-established:
  - "format_input wrapping pattern: try { callFormatInput } catch { classifyError + console.warn + use raw values }"
  - "ACE-Step envelope: raw.data contains result, raw.error checked before use"

requirements-completed: [GEN-01, GEN-02, GEN-03, GEN-05]

# Metrics
duration: 8min
completed: 2026-03-05
---

# Phase 2 Plan 01: format_input Integration Summary

**LLM-enhanced caption pipeline via ACE-Step /format_input before every generation job, with graceful fallback to raw prompt on failure**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-05T02:11:29Z
- **Completed:** 2026-03-05T02:19:08Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `callFormatInput()` to `src/lib/runpod.ts` with `FormatInputParams` / `FormatInputResult` types, ACE-Step envelope unwrapping, and defensive snake_case/camelCase field handling
- Wired `/api/generate` to call `format_input` before `submitGenerationJob`, passing genre tags concatenated into the prompt
- Enhanced caption, BPM, key scale, and time signature now flow into `submitGenerationJob`
- Graceful fallback: if `format_input` fails for any reason, generation continues with raw prompt (classifyError + console.warn)
- `enhancedCaption` returned in 201 response JSON for frontend display

## Task Commits

Each task was committed atomically:

1. **Task 1: Add callFormatInput to runpod.ts** - `23ff1c7` (feat)
2. **Task 2: Wire format_input into /api/generate route** - `69d0fe6` (feat)

## Files Created/Modified
- `src/lib/runpod.ts` - Added FormatInputParams, FormatInputResult interfaces and callFormatInput() function
- `src/app/api/generate/route.ts` - Imported callFormatInput, added format_input call with fallback, updated submitGenerationJob call and success response

## Decisions Made
- Genre tags concatenated into the format_input prompt string (`"${prompt}, ${genreTags}"`) — gives the LLM more context for BPM/key selection
- Fallback is silent for the end user (they get the same generation result, just without enhanced metadata)
- Raw response logged via `console.log` on every format_input call so field name variants can be confirmed against the live API

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- format_input integration complete; all generation jobs now receive LLM-enhanced captions
- Ready to proceed with remaining Phase 2 plans (polling, audio retrieval, frontend)
- Instrumental mode sends `[Instrumental]` as lyrics to format_input as specified

---
*Phase: 02-generation-api*
*Completed: 2026-03-05*

## Self-Check: PASSED

- FOUND: src/lib/runpod.ts
- FOUND: src/app/api/generate/route.ts
- FOUND: .planning/phases/02-generation-api/02-01-SUMMARY.md
- FOUND: commit 23ff1c7 (Task 1)
- FOUND: commit 69d0fe6 (Task 2)
