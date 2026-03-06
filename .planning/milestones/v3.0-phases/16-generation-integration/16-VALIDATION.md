---
phase: 16
slug: generation-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/lib/quiz-prompt.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/quiz-prompt.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | GENF-01 | unit | `npx vitest run src/lib/quiz-prompt.test.ts` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | GENF-01 | unit | `npx vitest run src/lib/quiz-prompt.test.ts` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 2 | GENF-02 | unit (mock) | `npx vitest run src/app/api/quiz-generate/route.test.ts` | ❌ W0 | ⬜ pending |
| 16-02-02 | 02 | 2 | GENF-03 | unit | `npx vitest run src/app/quiz` | ❌ W0 | ⬜ pending |
| 16-02-03 | 02 | 2 | GENF-04 | unit (mock) | `npx vitest run src/app/quiz` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/quiz-prompt.test.ts` — stubs for GENF-01 (prompt building, name in lyrics, genre mapping)
- [ ] `src/app/api/quiz-generate/route.test.ts` — stubs for GENF-02 (single job submission)

*No new framework install needed — vitest already configured with jsdom environment.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Personalized loading animation during wait | GENF-03 | Animation rendering requires browser; jsdom has no layout engine | Navigate quiz to final step, submit, verify animated overlay with personalized copy appears |
| URL changes to /quiz/success/[jobId] | GENF-04 | Router navigation requires Next.js runtime | Complete quiz, verify browser URL updates to /quiz/success/[jobId] and page survives refresh |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
