---
phase: 01-infrastructure-foundation
plan: 01
subsystem: infra
tags: [next.js, drizzle-orm, postgres, supabase, cloudflare-r2, zod, aws-sdk, runpod, typescript]

# Dependency graph
requires: []
provides:
  - Next.js 16 app skeleton (App Router, TypeScript, Tailwind)
  - Drizzle ORM schema: generations (14 cols) + outputs (5 cols) with pgEnum and relations
  - Drizzle client singleton with Supabase pooler-compatible configuration (prepare: false)
  - Zod-validated environment module (src/env.ts) for all 6 required vars
  - ACE-Step API client: submitGenerationJob, queryJobStatus, fetchAudioBuffer
  - Cloudflare R2 client: uploadAudioToR2, getAudioPresignedUrl, buildR2Key
  - Error classification: classifyError, toErrorResponse with 6 categories and dual-layer responses
  - drizzle.config.ts for schema migrations
  - .env.local.example documenting all required environment variables
affects:
  - 01-02 (RunPod validation uses runpod.ts client)
  - 01-03 (API routes use all lib modules + db client)
  - 02-ui (imports lib modules for generation requests)

# Tech tracking
tech-stack:
  added:
    - next@16.1.6
    - react@19.2.3
    - drizzle-orm@0.40+
    - drizzle-kit@0.31+
    - postgres@3.x (PostgreSQL driver, prepare:false for Supabase pooler)
    - "@aws-sdk/client-s3@3.x"
    - "@aws-sdk/s3-request-presigner@3.x"
    - zod@4.3.6
    - dotenv@16.x
    - tailwindcss@4.x
    - typescript@5.x
  patterns:
    - Zod v4 safeParse with .issues (not .errors) for validation errors
    - AbortController-based fetch timeouts (no setTimeout+throw pattern)
    - Drizzle client singleton with postgres driver prepare:false
    - R2 key naming: generations/{generationId}/output_{variantIndex}.wav
    - Dual-layer error responses: user-facing (safe) + technical (for logging)
    - src/env.ts as the single source for all env vars — no direct process.env in lib code

key-files:
  created:
    - src/env.ts
    - src/db/schema.ts
    - src/db/index.ts
    - src/lib/runpod.ts
    - src/lib/r2.ts
    - src/lib/errors.ts
    - drizzle.config.ts
    - .env.local.example
    - .gitignore
    - tsconfig.scripts.json
  modified:
    - src/app/layout.tsx (metadata: title MusicGenerator, description AI-powered music generation)
    - src/app/page.tsx (placeholder page showing API route list)
    - tsconfig.json (exclude scripts/ from Next.js TypeScript build)
    - scripts/validate-acestep.ts (fixed import names to match actual exports)

key-decisions:
  - "Used Zod v4 .issues (not .errors) for safeParse error formatting — Zod v4 API change"
  - "AbortController for fetch timeouts: 30s for submit/download, 90s for job polling"
  - "scripts/ excluded from tsconfig.json to prevent Next.js build errors — scripts use tsx directly"
  - "env.ts throws at import time if any required var is missing — fails fast before server starts"
  - "R2 client is a singleton initialized at module load time using env vars"

patterns-established:
  - "Pattern: All env var access goes through src/env.ts — never use process.env directly in lib code"
  - "Pattern: AbortController with unref() on timer for fetch timeouts in Node.js"
  - "Pattern: Dual-layer error responses: error (user-facing) + debug (technical) in toErrorResponse"
  - "Pattern: Drizzle index definitions as array of index() calls (Drizzle v0.40+ API)"

requirements-completed:
  - INFRA-02
  - INFRA-03

# Metrics
duration: 6min
completed: 2026-03-03
---

# Phase 1 Plan 01: Infrastructure Foundation Summary

**Next.js 16 + Drizzle ORM scaffold with ACE-Step RunPod client, Cloudflare R2 client, and typed error classification — all compiled with zero TypeScript errors**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-03T21:01:35Z
- **Completed:** 2026-03-03T21:07:36Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Bootable Next.js 16 app with App Router, TypeScript strict mode, Tailwind v4 — `npm run build` passes
- Drizzle ORM schema: `generations` (14 columns) + `outputs` (5 columns) with pgEnum for status, indexes on hot query paths, and `generationsRelations`/`outputsRelations`
- Three typed lib modules compile with zero TypeScript errors: RunPod ACE-Step client, Cloudflare R2 client, error classification with 6 categories and dual-layer responses
- Zod v4 environment validation module — fails fast with clear messages if any of 6 required vars is missing
- `.env.local.example` documents all required environment variables with instructions on where to find each value

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js app with Drizzle schema and database connection** - `33b8985` (feat)
2. **Task 2: Create RunPod client, R2 client, and error classification modules** - `3f6b491` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/env.ts` - Zod v4 environment validation for DATABASE_URL, RUNPOD_URL, CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
- `src/db/schema.ts` - Drizzle pgEnum + generations (14 cols) + outputs (5 cols) + relations
- `src/db/index.ts` - Drizzle singleton with postgres driver (prepare: false for Supabase pooler)
- `src/lib/runpod.ts` - ACE-Step API client: submitGenerationJob, queryJobStatus, fetchAudioBuffer with AbortController timeouts
- `src/lib/r2.ts` - Cloudflare R2 client: uploadAudioToR2, getAudioPresignedUrl, buildR2Key
- `src/lib/errors.ts` - Error classification: classifyError (6 categories), toErrorResponse (dual-layer)
- `drizzle.config.ts` - Drizzle Kit config for schema migrations to Supabase
- `.env.local.example` - All required env vars with source instructions
- `.gitignore` - Excludes node_modules, .next, .env files
- `tsconfig.json` - Modified to exclude scripts/ from Next.js TypeScript compilation
- `tsconfig.scripts.json` - Separate tsconfig for validation scripts (run via tsx)
- `src/app/layout.tsx` - Updated metadata: title "MusicGenerator", description "AI-powered music generation"
- `src/app/page.tsx` - Placeholder page showing Phase 1 status and API route list

## Decisions Made

- **Zod v4 .issues:** The installed version (zod@4.3.6) uses `.issues` not `.errors` on `ZodError`. Updated `src/env.ts` accordingly.
- **AbortController timeouts:** Used AbortController with `.unref()` on the timer to avoid blocking Node.js exit. Timeouts: 30s for job submit, 90s for job polling (10x expected max for RTX 3090), 30s for audio download.
- **scripts/ excluded from tsconfig:** The pre-existing `scripts/validate-acestep.ts` was included by `**/*.ts` but imported not-yet-created lib modules, causing build failure. Excluded `scripts/` from `tsconfig.json` and added `tsconfig.scripts.json` for running with `tsx`.
- **env.ts singleton:** The R2 and RunPod clients initialize at module load time using env vars — this means they'll throw at import time if env vars are missing, which is the intended fast-fail behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added .gitignore to prevent node_modules/build artifacts from being tracked**
- **Found during:** Task 1 (post-scaffold git status check)
- **Issue:** No .gitignore existed; git status showed node_modules and .next as untracked — would have been committed without intervention
- **Fix:** Created `.gitignore` covering node_modules, .next, .env files, and standard OS/editor files
- **Files modified:** .gitignore (created)
- **Verification:** `git status` no longer shows node_modules or .next
- **Committed in:** 33b8985 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed Next.js build failure: scripts/ included in TypeScript compilation**
- **Found during:** Task 1 verification (first `npm run build` run)
- **Issue:** `tsconfig.json` includes `**/*.ts` which pulled in `scripts/validate-acestep.ts` — it imported `@/lib/runpod` which didn't exist yet, causing build failure
- **Fix:** Added `"scripts"` to `exclude` in `tsconfig.json`; created `tsconfig.scripts.json` for tsx-based script execution
- **Files modified:** tsconfig.json, tsconfig.scripts.json (created)
- **Verification:** `npm run build` passes after exclusion
- **Committed in:** 33b8985 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed Zod v4 error property — `.errors` does not exist on ZodError in Zod v4**
- **Found during:** Task 1 verification (second `npm run build` run)
- **Issue:** `src/env.ts` used `parsed.error.errors.map(...)` but Zod v4 renamed this property to `.issues`
- **Fix:** Changed `.errors` to `.issues` and updated the map callback variable name to `issue`
- **Files modified:** src/env.ts
- **Verification:** `npm run build` passes with zero TypeScript errors
- **Committed in:** 33b8985 (Task 1 commit)

**4. [Rule 1 - Bug] Fixed validate-acestep.ts to use correct export names from src/lib/runpod.ts**
- **Found during:** Task 2 (lib module creation)
- **Issue:** Pre-existing `scripts/validate-acestep.ts` imported `submitGeneration` and `pollResult` — but the plan specifies `submitGenerationJob` and `queryJobStatus` as the exported function names
- **Fix:** Updated import to use `{ submitGenerationJob, queryJobStatus }` and updated all call sites to pass params as the correct `SubmitJobParams` object structure
- **Files modified:** scripts/validate-acestep.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 3f6b491 (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 blocking issues, 2 bugs)
**Impact on plan:** All auto-fixes were necessary for build correctness. No scope creep — no features added beyond the plan.

## Issues Encountered

- `npx create-next-app@latest .` failed because npm package name can't contain capital letters ("MusicGenerator"). Scaffolded into `/tmp/music-generator` and copied files to project root.

## User Setup Required

None at this stage — this plan creates the code foundation only. External services (Supabase, RunPod, Cloudflare R2) are configured in Phase 1 Plans 02 and 03.

## Next Phase Readiness

- **Ready:** All lib modules and DB schema are in place for Plan 01-02 (RunPod validation) and Plan 01-03 (API routes)
- **Blocker:** All 6 env vars in `.env.local.example` must be populated before running the dev server or API routes
- **Note:** `scripts/validate-acestep.ts` is ready to run against a live RunPod pod — requires `RUNPOD_URL` env var

---
*Phase: 01-infrastructure-foundation*
*Completed: 2026-03-03*

## Self-Check: PASSED

All files verified present:
- src/env.ts: FOUND
- src/db/schema.ts: FOUND
- src/db/index.ts: FOUND
- src/lib/runpod.ts: FOUND
- src/lib/r2.ts: FOUND
- src/lib/errors.ts: FOUND
- drizzle.config.ts: FOUND
- .env.local.example: FOUND
- 01-01-SUMMARY.md: FOUND

All commits verified:
- 33b8985: FOUND (Task 1)
- 3f6b491: FOUND (Task 2)
