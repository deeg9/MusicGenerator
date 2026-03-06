---
phase: 19
slug: error-boundaries-and-api-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/app/api/poll-job` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | ERR-01 | unit | `npx vitest run src/app/quiz/error` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 1 | ERR-01 | unit | `npx vitest run src/app/quiz/success/error` | ❌ W0 | ⬜ pending |
| 19-02-01 | 02 | 1 | ERR-02 | unit | `npx vitest run src/app/api/poll-job` | ❌ W0 | ⬜ pending |
| 19-02-02 | 02 | 1 | ERR-02 | unit | `npx vitest run src/lib/errors` | ❌ W0 | ⬜ pending |
| 19-02-03 | 02 | 1 | ERR-02 | unit | `npx vitest run src/app/api/quiz-generate` | ✅ (needs update) | ⬜ pending |
| 19-03-01 | 03 | 1 | ERR-03 | unit | `npx vitest run src/app/quiz/success` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/quiz/error.test.tsx` — stubs for ERR-01 (quiz boundary renders, `reset()` called, "Go home" link)
- [ ] `src/app/quiz/success/error.test.tsx` — stubs for ERR-01 (success boundary renders)
- [ ] `src/app/api/poll-job/[jobId]/route.test.ts` — stubs for ERR-02 (granular 404 vs 502, standard shape)
- [ ] `src/lib/errors.test.ts` — stubs for ERR-02 (production stripping of debug.technicalMessage)
- [ ] `src/app/quiz/success/[jobId]/page.test.tsx` — stubs for ERR-03 (timeout UI, Check Again, 15s subtitle)
- [ ] Update `src/app/api/quiz-generate/route.test.ts` — update assertions from `body.error` string to `body.error.userMessage`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual error boundary matches brand style | ERR-01 | CSS/visual fidelity | Navigate to /quiz, trigger error via React DevTools, verify yellow-100 icon + warm copy + rounded card |
| "Still working on it..." feels non-jarring | ERR-03 | UX timing perception | Start generation, wait 15s, verify subtitle swap is smooth (no layout shift) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
