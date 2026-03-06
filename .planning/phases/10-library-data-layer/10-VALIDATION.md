---
phase: 10
slug: library-data-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/app/library` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/app/library`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | LIB2-06 | unit | `npx vitest run src/components/LibraryEmpty.test.tsx` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | LIB2-02 | unit (async RSC) | `npx vitest run src/app/library/page.test.tsx` | ✅ (must replace) | ⬜ pending |
| 10-01-03 | 01 | 1 | LIB2-03 | unit | `npx vitest run src/components/LibrarySongCard.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/LibrarySongCard.test.tsx` — stubs for LIB2-03 card display (title, tags, duration, date)
- [ ] `src/components/LibraryEmpty.test.tsx` — stubs for LIB2-06 extracted empty state component
- [ ] `src/app/library/page.test.tsx` — REPLACE existing tests (current tests render stub synchronously; must be rewritten to mock `@/db` and test async RSC pattern)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSR — data present on first paint (no loading spinner) | LIB2-02, SC3 | Requires View Source inspection in browser | Navigate to /library → View Source → verify song content is in HTML, not a loading skeleton |
| Presigned URLs are valid and accessible | LIB2-02 | R2 URLs require live infrastructure | Generate a song → navigate to /library → inspect card data for valid presigned URL format |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
