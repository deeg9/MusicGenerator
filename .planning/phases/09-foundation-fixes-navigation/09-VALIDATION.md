---
phase: 9
slug: foundation-fixes-navigation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

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
| 09-01-01 | 01 | 0 | FIX-01 | unit | `npx vitest run src/components/GenerationPage.test.tsx -t "navigate-create"` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 0 | FIX-03 | unit | `npx vitest run src/lib/gsap-config.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 0 | LIB2-01 | unit | `npx vitest run src/app/library/page.test.tsx` | ❌ W0 | ⬜ pending |
| 09-01-04 | 01 | 1 | FIX-01 | unit | `npx vitest run src/components/GenerationPage.test.tsx -t "navigate-create"` | ❌ W0 | ⬜ pending |
| 09-01-05 | 01 | 1 | FIX-02 | smoke | `node -e "require('gsap')"` | ❌ W0 | ⬜ pending |
| 09-01-06 | 01 | 1 | FIX-03 | unit | `npx vitest run src/lib/gsap-config.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-07 | 01 | 1 | LIB2-01 | unit/smoke | `npx vitest run src/app/library/page.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/GenerationPage.test.tsx` — stubs for FIX-01 (navigate-create listener registered once, cleanup on unmount)
- [ ] `src/lib/gsap-config.test.ts` — stubs for FIX-03 (gsap exported, ScrambleTextPlugin registered)
- [ ] `src/app/library/page.test.tsx` — stubs for LIB2-01 (LibraryPage renders empty state text + CTA)

*FIX-02 validated by smoke command `node -e "require('gsap')"` — no test file needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Library nav item shows active border on /library | LIB2-01 | Visual styling verification | Navigate to /library, inspect Library nav item has left border in amber/primary |
| No layout shift on active border | LIB2-01 | Visual pixel check | Toggle between / and /library, confirm icon position does not shift |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
