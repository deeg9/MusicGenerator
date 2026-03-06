---
phase: 20
slug: page-object-models-and-smoke-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `playwright.config.ts` (exists — Phase 18) |
| **Quick run command** | `npx playwright test e2e/landing.spec.ts --project=chromium` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test e2e/landing.spec.ts --project=chromium`
- **After every plan wave:** Run `npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | INFRA-04 | structural | `npx playwright test --list` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 1 | E2E-01 | E2E smoke | `npx playwright test e2e/landing.spec.ts --project=chromium` | ❌ W0 | ⬜ pending |
| 20-02-01 | 02 | 1 | E2E-02 | E2E | `npx playwright test e2e/quiz-navigation.spec.ts --project=chromium` | ❌ W0 | ⬜ pending |
| 20-02-02 | 02 | 1 | E2E-03 | E2E | `npx playwright test e2e/quiz-validation.spec.ts --project=chromium` | ❌ W0 | ⬜ pending |
| 20-02-03 | 02 | 1 | E2E-04 | E2E | `npx playwright test e2e/quiz-navigation.spec.ts --project=chromium` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `e2e/pages/landing.ts` — LandingPage POM (INFRA-04)
- [ ] `e2e/pages/quiz.ts` — QuizPage POM (INFRA-04)
- [ ] `e2e/pages/success.ts` — SuccessPage POM stub (INFRA-04)
- [ ] `e2e/fixtures.ts` — shared valid quiz data
- [ ] `e2e/landing.spec.ts` — E2E-01 spec
- [ ] `e2e/quiz-validation.spec.ts` — E2E-03 spec
- [ ] `e2e/quiz-navigation.spec.ts` — E2E-02 + E2E-04 spec

*Existing infrastructure covers framework install — only test files needed.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
