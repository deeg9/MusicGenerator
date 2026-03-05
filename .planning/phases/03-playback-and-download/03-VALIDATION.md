---
phase: 3
slug: playback-and-download
status: draft
nyquist_compliant: false
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
| **Config file** | vitest.config.ts (Wave 0 creates) |
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | PLAY-01 | setup | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | PLAY-01 | unit | `npx vitest run src/components/WaveformPlayer.test.tsx` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | PLAY-01 | unit | `npx vitest run src/components/GenerationResults.test.tsx` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | PLAY-02 | unit | `npx vitest run src/lib/audio.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | PLAY-02 | integration | `npx vitest run src/app/api/status/route.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 1 | PLAY-03 | unit | `npx vitest run src/lib/r2.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — configure jsdom environment for React component tests
- [ ] `npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom` — framework install
- [ ] `src/components/WaveformPlayer.test.tsx` — stubs for PLAY-01 (mock wavesurfer.js)
- [ ] `src/components/GenerationResults.test.tsx` — stubs for PLAY-01 auto-pause behavior
- [ ] `src/lib/audio.test.ts` — stubs for PLAY-02 MP3 conversion
- [ ] `src/lib/r2.test.ts` — stubs for PLAY-03 presigned URL content-disposition
- [ ] `src/app/api/status/route.test.ts` — stubs for PLAY-02 integration

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Seek via waveform click | PLAY-01 | Web Audio + canvas cannot be unit tested headlessly | Click waveform at various positions, verify audio seeks to clicked position |
| Waveform renders bars at correct color | PLAY-01 | Visual regression requires browser | Inspect waveform — bars should be zinc-700 (#3f3f46) with violet-500 (#8b5cf6) progress |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
