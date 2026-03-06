---
phase: 17
slug: success-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + jsdom + @testing-library/react |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/app/quiz/success` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/app/quiz/success`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | SUCC-01 | unit | `npx vitest run src/app/quiz/success/[jobId]/page.test.tsx` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | SUCC-02 | unit | `npx vitest run src/app/quiz/success/[jobId]/page.test.tsx` | ❌ W0 | ⬜ pending |
| 17-01-03 | 01 | 1 | SUCC-03 | unit | `npx vitest run src/app/quiz/success/[jobId]/page.test.tsx` | ❌ W0 | ⬜ pending |
| 17-01-04 | 01 | 1 | SUCC-04 | unit | `npx vitest run src/app/quiz/success/[jobId]/page.test.tsx` | ❌ W0 | ⬜ pending |
| 17-01-05 | 01 | 1 | SUCC-05 | unit | `npx vitest run src/app/quiz/success/[jobId]/page.test.tsx` | ❌ W0 | ⬜ pending |
| 17-01-06 | 01 | 1 | SUCC-02 | unit | `npx vitest run src/app/api/audio` | ❌ W0 | ⬜ pending |
| 17-01-07 | 01 | 1 | polling | unit | `npx vitest run src/app/api/poll-job` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/quiz/success/[jobId]/page.test.tsx` — stubs for SUCC-01 through SUCC-05
- [ ] `src/app/api/audio/[jobId]/route.test.ts` — covers audio proxy behavior
- [ ] `src/app/api/poll-job/[jobId]/route.test.ts` — covers poll status passthrough
- [ ] Mock `canvas-confetti`: `vi.mock('canvas-confetti', () => ({ default: vi.fn() }))`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Confetti visual quality | SUCC-01 | Canvas rendering not verifiable in jsdom | Load success page with completed job, confirm confetti burst is visible and celebratory |
| Audio playback works end-to-end | SUCC-02 | Requires real audio stream | Navigate to success page, confirm audio plays via native controls |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
