---
phase: 18
slug: playwright-setup-and-environment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.x |
| **Config file** | `playwright.config.ts` (Wave 0 — to be created) |
| **Quick run command** | `npx playwright test e2e/smoke.spec.ts` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test e2e/smoke.spec.ts`
- **After every plan wave:** Run `npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | INFRA-02 | smoke | `npx playwright test e2e/smoke.spec.ts` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | INFRA-01 | smoke | `npm run test:e2e` (globalSetup pod check) | ❌ W0 | ⬜ pending |
| 18-01-03 | 01 | 1 | INFRA-03 | config | `npm run test:e2e` (timeout config verified by passing) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `e2e/smoke.spec.ts` — stubs for INFRA-02 (harness boots, app responds)
- [ ] `e2e/global-setup.ts` — covers INFRA-01 (pod health check)
- [ ] `playwright.config.ts` — covers INFRA-02, INFRA-03 (webServer, timeouts, reducedMotion)
- [ ] `e2e/tsconfig.json` — required for TypeScript resolution in Node.js context
- [ ] Framework install: `npm install -D @playwright/test @next/bundle-analyzer && npx playwright install chromium`

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pod reachability from dev machine | INFRA-01 | Network-dependent | Run `npm run test:e2e`, verify globalSetup logs show pod health check pass |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
