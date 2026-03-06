---
phase: 12
slug: same-page-workspace-transformation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run --reporter=verbose src/components/HeroSection.test.tsx src/components/GenerationPage.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose src/components/HeroSection.test.tsx src/components/GenerationPage.test.tsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | HOME-01 | unit | `npx vitest run src/components/HeroSection.test.tsx` | ✅ (needs update) | ⬜ pending |
| 12-01-02 | 01 | 1 | HOME-02 | unit | `npx vitest run src/components/HeroSection.test.tsx` | ✅ (needs update) | ⬜ pending |
| 12-02-01 | 02 | 1 | HOME-03 | unit | `npx vitest run src/components/GenerationPage.test.tsx` | ✅ (needs update) | ⬜ pending |
| 12-02-02 | 02 | 1 | HOME-05 | unit | `npx vitest run src/components/GenerationPage.test.tsx` | ✅ (needs update) | ⬜ pending |
| 12-02-03 | 02 | 1 | HOME-05 | unit | `npx vitest run src/components/GenerationPage.test.tsx` | ✅ (needs update) | ⬜ pending |
| 12-03-01 | 03 | 2 | HOME-04 | unit | `npx vitest run src/components/GenerationPage.test.tsx` | ✅ (needs update) | ⬜ pending |
| 12-03-02 | 03 | 2 | HOME-06 | unit | `npx vitest run src/components/GenerationPage.test.tsx` | ✅ (needs update) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. `HeroSection.test.tsx` and `GenerationPage.test.tsx` exist and must be updated (not created) to reflect the new component structure. No new test files or framework installs required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Framer Motion layout transition is visually smooth | HOME-06 | Visual quality cannot be asserted programmatically | 1. Load homepage 2. Click Create 3. Verify hero collapses smoothly and workspace panels expand |
| Browser back button returns to hero | HOME-05 | Browser history navigation requires integration context | 1. Navigate to workspace via Create 2. Press browser back 3. Verify hero view restores |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
