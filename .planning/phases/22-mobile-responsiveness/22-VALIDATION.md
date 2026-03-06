---
phase: 22
slug: mobile-responsiveness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `playwright.config.ts` (root) |
| **Quick run command** | `npx playwright test e2e/mobile-landing.spec.ts --project=mobile-iphone` |
| **Full suite command** | `npx playwright test e2e/mobile-*.spec.ts --project=mobile-iphone --project=mobile-ipad` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test e2e/mobile-landing.spec.ts --project=mobile-iphone`
- **After every plan wave:** Run `npx playwright test e2e/mobile-*.spec.ts --project=mobile-iphone --project=mobile-ipad`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | MOB-01 | E2E | `npx playwright test e2e/mobile-landing.spec.ts --project=mobile-iphone` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | MOB-01 | E2E | `npx playwright test e2e/mobile-landing.spec.ts --project=mobile-ipad` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 1 | MOB-02 | E2E | `npx playwright test e2e/mobile-quiz.spec.ts --project=mobile-iphone` | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 1 | MOB-03 | E2E | `npx playwright test e2e/mobile-success.spec.ts --project=mobile-iphone` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `e2e/mobile-landing.spec.ts` — stubs for MOB-01
- [ ] `e2e/mobile-quiz.spec.ts` — stubs for MOB-02
- [ ] `e2e/mobile-success.spec.ts` — stubs for MOB-03
- [ ] `package.json` script `"test:e2e:mobile"` — new entry point

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| iOS Safari audio autoplay | MOB-03 | Playwright device preset simulates viewport but not real iOS autoplay policy | Test on physical device: tap play button, verify audio starts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
