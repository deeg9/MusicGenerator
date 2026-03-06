---
phase: 15
slug: quiz-funnel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/app/quiz` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/app/quiz`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | QUIZ-07 | unit | `npx vitest run src/app/quiz/_components/QuizProgress.test.tsx` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | QUIZ-01 | unit | `npx vitest run src/app/quiz/_components/Step1Relationship.test.tsx` | ❌ W0 | ⬜ pending |
| 15-01-03 | 01 | 1 | QUIZ-02 | unit | `npx vitest run src/app/quiz/_components/Step2GenreVoice.test.tsx` | ❌ W0 | ⬜ pending |
| 15-01-04 | 01 | 1 | QUIZ-03 | unit | `npx vitest run src/app/quiz/_components/Step3Qualities.test.tsx` | ❌ W0 | ⬜ pending |
| 15-01-05 | 01 | 1 | QUIZ-04 | unit | `npx vitest run src/app/quiz/_components/Step4Memories.test.tsx` | ❌ W0 | ⬜ pending |
| 15-01-06 | 01 | 1 | QUIZ-05 | unit | `npx vitest run src/app/quiz/_components/Step5Message.test.tsx` | ❌ W0 | ⬜ pending |
| 15-01-07 | 01 | 1 | QUIZ-06 | unit | `npx vitest run src/app/quiz/_components/Step6Language.test.tsx` | ❌ W0 | ⬜ pending |
| 15-01-08 | 01 | 1 | QUIZ-09 | unit | `npx vitest run src/app/quiz/page.test.tsx` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | QUIZ-08 | manual | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/quiz/_components/QuizProgress.test.tsx` — stubs for QUIZ-07
- [ ] `src/app/quiz/_components/Step1Relationship.test.tsx` — stubs for QUIZ-01
- [ ] `src/app/quiz/_components/Step2GenreVoice.test.tsx` — stubs for QUIZ-02
- [ ] `src/app/quiz/_components/Step3Qualities.test.tsx` — stubs for QUIZ-03
- [ ] `src/app/quiz/_components/Step4Memories.test.tsx` — stubs for QUIZ-04
- [ ] `src/app/quiz/_components/Step5Message.test.tsx` — stubs for QUIZ-05
- [ ] `src/app/quiz/_components/Step6Language.test.tsx` — stubs for QUIZ-06
- [ ] `src/app/quiz/page.test.tsx` — stubs for QUIZ-09

*No new framework install needed — vitest + @testing-library/react already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slide transition direction-aware | QUIZ-08 | Framer Motion AnimatePresence exit animations do not execute in jsdom (no layout engine) | Navigate forward: step slides in from right. Navigate back: step slides in from left. Verify in browser. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
