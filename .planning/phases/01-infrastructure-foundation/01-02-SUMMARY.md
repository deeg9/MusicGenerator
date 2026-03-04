---
phase: 01-infrastructure-foundation
plan: 02
subsystem: infra
tags: [docker, supervisord, runpod, ace-step, validation, cloudflare-r2, supabase]

# Dependency graph
requires:
  - phase: 01-infrastructure-foundation/01-01
    provides: RunPod client and R2 client modules used by validate-acestep.ts
provides:
  - Docker image config for ACE-Step with supervisord crash recovery
  - Shell validation script for testing live ACE-Step API endpoints
  - TypeScript validation script using project runpod client
  - ACE-Step validation results template for Phase 2 reference
affects:
  - 02-generation-api
  - 03-frontend

# Tech tracking
tech-stack:
  added: [docker, supervisor, supervisord]
  patterns: [supervisord autorestart for memory-leak-prone GPU processes]

key-files:
  created:
    - docker/Dockerfile
    - docker/supervisord.conf
    - scripts/validate-acestep.sh
    - scripts/validate-acestep.ts
    - docs/ACESTEP-VALIDATION.md
  modified: []

key-decisions:
  - "supervisord with autorestart=true and startretries=999 as the crash recovery mechanism for ACE-Step memory leak (GitHub #142)"
  - "Stock valyriantech/ace-step-1.5 image used first; custom Dockerfile only deployed if stress test reveals OOM crashes"
  - "Validation covers 5 scenarios: health check, basic generation, instrumental mode, dual variant, sequential stress (5x)"
  - "ACESTEP-VALIDATION.md pre-filled with expected values from research; actual values filled in after running against live pod"

patterns-established:
  - "Checkpoint:human-action for external service setup (RunPod, Supabase, Cloudflare R2) — cannot be automated"

requirements-completed: [INFRA-01]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 1 Plan 02: ACE-Step Docker Config and Validation Scripts Summary

**supervisord-wrapped Docker image for ACE-Step crash recovery plus 5-scenario validation suite (shell + TypeScript) and ACESTEP-VALIDATION.md reference template**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T18:40:23Z
- **Completed:** 2026-03-04T18:45:00Z
- **Tasks:** 1 of 2 (Task 2 is a human-action checkpoint — awaiting external service setup)
- **Files modified:** 5

## Accomplishments
- Docker image config extending valyriantech/ace-step-1.5 with supervisord for automatic process restart (crash recovery for memory leak GitHub #142)
- Shell validation script (validate-acestep.sh) running 5 tests: health check, basic generation, instrumental mode, dual variant, sequential stress test
- TypeScript validation script (validate-acestep.ts) using the project's runpod client module, same 5 scenarios
- ACESTEP-VALIDATION.md template pre-filled with expected API field names from research, ready to capture actual results

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Docker config and validation scripts for ACE-Step** - `48ba5ce` (feat)

**Plan metadata:** _(pending after Task 2 completes)_

## Files Created/Modified
- `docker/Dockerfile` - Extends valyriantech/ace-step-1.5, installs supervisor, runs supervisord as PID 1
- `docker/supervisord.conf` - autorestart=true, 999 startretries, logs to /workspace/logs/
- `scripts/validate-acestep.sh` - 5-test bash validation script using curl/jq, surfaces unexpected response fields
- `scripts/validate-acestep.ts` - TypeScript equivalent using @/lib/runpod client, structured TestResult types
- `docs/ACESTEP-VALIDATION.md` - Validation template: test environment, API field confirmation, instrumental mode, custom lyrics, timing data, memory leak observations, open issues

## Decisions Made
- supervisord with autorestart=true chosen over RunPod restart policy because it recovers faster (sub-second) and doesn't incur pod boot time
- Stock image tested first before building custom Docker image — avoids unnecessary Docker registry setup if stock image is stable
- Both shell and TypeScript validation scripts provided: shell for quick manual runs on any machine, TypeScript for programmatic integration
- Validation template pre-filled with research-based expected values so actual vs. expected diff is immediately visible

## Deviations from Plan

None - plan executed exactly as written. Task 1 files matched the spec exactly.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration before Task 2 can complete.**

Three services must be deployed:

1. **Supabase** — Create project, copy Transaction mode DATABASE_URL (port 6543) to `.env.local`
2. **Cloudflare R2** — Create `music-generator-audio` bucket, generate API token, configure CORS, add credentials to `.env.local`
3. **RunPod** — Deploy Persistent Pod with RTX 3090/4090, expose port 8000, copy proxy URL to `.env.local` as RUNPOD_URL

After services are deployed:
```bash
bash scripts/validate-acestep.sh $RUNPOD_URL
npx drizzle-kit push
```

Fill in `docs/ACESTEP-VALIDATION.md` with actual results.

## Next Phase Readiness

- Docker config ready to deploy if stock ACE-Step image shows OOM instability
- Validation scripts ready to run against any live ACE-Step endpoint
- ACESTEP-VALIDATION.md template ready to capture Phase 2 reference data
- Plan complete pending: external service deployment + validation run + database push (Task 2)

---
*Phase: 01-infrastructure-foundation*
*Completed: 2026-03-04*

## Self-Check: PASSED

- FOUND: docker/Dockerfile
- FOUND: docker/supervisord.conf
- FOUND: scripts/validate-acestep.sh
- FOUND: scripts/validate-acestep.ts
- FOUND: docs/ACESTEP-VALIDATION.md
- FOUND: 01-02-SUMMARY.md
- FOUND commit: 48ba5ce (feat(01-02): create Docker config and ACE-Step validation scripts)
