---
phase: 21
slug: happy-path-and-error-state-e2e
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test e2e/error-states.spec.ts --project=chromium` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~15 seconds (mocked); ~120 seconds (with happy path on live pod) |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test e2e/error-states.spec.ts --project=chromium`
- **After every plan wave:** Run `npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds (mocked tests)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | E2E-06, E2E-07 | E2E (mocked) | `npx playwright test e2e/error-states.spec.ts --project=chromium` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | E2E-05 | E2E (live pod) | `npx playwright test e2e/happy-path.spec.ts --project=chromium` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `e2e/error-states.spec.ts` — E2E-06 + E2E-07 error state specs
- [ ] `e2e/happy-path.spec.ts` — E2E-05 happy path spec
- [ ] `e2e/pages/success.ts` — extend POM with `errorHeading`, `podDownHeading`, `tryAgainButton`, `startOverButton`

*No framework installs needed — all infrastructure in place.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audio playback produces sound | E2E-05 | Browser audio output cannot be verified programmatically | Play generated audio on success page, confirm audible output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
