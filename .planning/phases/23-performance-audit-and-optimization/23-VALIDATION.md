---
phase: 23
slug: performance-audit-and-optimization
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-06
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npm run test:e2e -- e2e/landing.spec.ts` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:e2e -- e2e/landing.spec.ts`
- **After every plan wave:** Run `npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | PERF-01 | manual | `npm run analyze` | N/A — manual | ⬜ pending |
| 23-01-02 | 01 | 1 | PERF-02 | manual + regression | `npm run analyze` + `npm run test:e2e -- e2e/landing.spec.ts` | ✅ | ⬜ pending |
| 23-01-03 | 01 | 1 | PERF-03 | manual | `npm run analyze` → client.html | N/A — manual | ⬜ pending |
| 23-02-01 | 02 | 2 | PERF-04 | manual | `npx lighthouse http://localhost:3000 --output json` | N/A — manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bundle analysis report generated | PERF-01 | Bundle composition requires webpack output inspection | Run `npm run analyze`, verify `client.html` opens |
| Below-fold sections not in initial bundle | PERF-02 | Bundle tree-shaking only verifiable via analyzer output | Check `client.html` for absence of below-fold chunks in initial route |
| canvas-confetti absent from non-success routes | PERF-03 | Dynamic import verification requires bundle inspection | Check `client.html` for confetti only in success route chunk |
| LCP < 2.5s and CLS < 0.1 | PERF-04 | Core Web Vitals require real browser paint measurement | Run Lighthouse CLI, check JSON output for LCP < 2500 and CLS < 0.1 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-06
