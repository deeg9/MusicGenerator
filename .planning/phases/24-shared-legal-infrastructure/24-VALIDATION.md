---
phase: 24
slug: shared-legal-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.x + @testing-library/react 16.x |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/components/LegalLayout.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/components/LegalLayout.test.tsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 0 | INFRA-01, INFRA-02 | unit | `npx vitest run src/components/LegalLayout.test.tsx` | ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 1 | INFRA-02 | unit (DOM) | `npx vitest run src/components/LegalLayout.test.tsx` | ❌ W0 | ⬜ pending |
| 24-01-03 | 01 | 1 | INFRA-01 | unit | `npx vitest run src/components/LegalLayout.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/LegalLayout.test.tsx` — stubs for INFRA-01 and INFRA-02 (render assertions for LegalLayout + .prose-legal CSS)

*Existing infrastructure covers framework setup. Only the test file is missing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual brand consistency (baby blue, warm feel) | INFRA-01, INFRA-02 | Visual/aesthetic judgment | Render LegalLayout with sample content, verify Libre Baskerville heading, DM Sans body, OKLCH token colors match brand |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
