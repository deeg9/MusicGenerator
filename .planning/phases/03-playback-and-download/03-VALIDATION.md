---
phase: 3
slug: playback-and-download
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-04
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + jsdom + @testing-library/react |
| **Config file** | vitest.config.ts (Plan 01 Task 0 creates) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Task | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-00 | 01 | Task 0: Vitest setup + stubs | PLAY-01/02/03 | setup | `npx vitest run` | Wave 0 creates | pending |
| 03-01-01 | 01 | Task 1: MP3 lib, filename, R2, schema | PLAY-02, PLAY-03 | unit | `npx vitest run src/lib/audio.test.ts src/lib/r2.test.ts` | Wave 0 stubs, Task 1 fills | pending |
| 03-01-02 | 01 | Task 2: Wire MP3 into status route | PLAY-02 | integration | `npx vitest run src/app/api/status/route.test.ts` | Wave 0 stubs, Task 2 fills | pending |
| 03-02-01 | 02 | Task 1: WaveformPlayer, hook, VariantCard | PLAY-01 | unit | `npx vitest run src/components/WaveformPlayer.test.tsx` | Wave 0 stubs, Task 1 fills | pending |
| 03-02-02 | 02 | Task 2: Auto-pause, URL persistence | PLAY-01 | unit | `npx vitest run src/components/GenerationResults.test.tsx` | Wave 0 stubs, Task 2 fills | pending |
| 03-02-03 | 02 | Task 3: Human verify | PLAY-01/02/03 | manual | Human approval | N/A | pending |

*Status: pending . green . red . flaky*

---

## Wave 0 Requirements

Wave 0 is implemented as Plan 01 Task 0.

- [x] `vitest.config.ts` — configure jsdom environment for React component tests
- [x] `npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom` — framework install
- [x] `src/components/WaveformPlayer.test.tsx` — stubs for PLAY-01 (mock wavesurfer.js)
- [x] `src/components/GenerationResults.test.tsx` — stubs for PLAY-01 auto-pause behavior
- [x] `src/lib/audio.test.ts` — stubs for PLAY-02 MP3 conversion
- [x] `src/lib/r2.test.ts` — stubs for PLAY-03 presigned URL content-disposition
- [x] `src/app/api/status/route.test.ts` — stubs for PLAY-02 integration

All Wave 0 items are addressed in Plan 01 Task 0 (first task executed).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Seek via waveform click | PLAY-01 | Web Audio + canvas cannot be unit tested headlessly | Click waveform at various positions, verify audio seeks to clicked position |
| Waveform renders bars at correct color | PLAY-01 | Visual regression requires browser | Inspect waveform — bars should be zinc-700 (#3f3f46) with violet-500 (#8b5cf6) progress |

---

## R2 CORS Note

wavesurfer.js uses Web Audio API fetch which requires CORS headers. R2 bucket currently allows localhost:3000. Before production deployment, update R2 CORS in Cloudflare dashboard to include the production domain.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
