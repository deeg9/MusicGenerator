---
phase: 31
slug: success-page-dashboard-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + @testing-library/react 16.x |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/app/dashboard` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/app/quiz/success/[jobId]/_components` or `npx vitest run src/app/dashboard`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | SUCC-01 | unit | `npx vitest run src/app/quiz/success/[jobId]/_components/AuthPrompt.test.tsx` | ❌ W0 | ⬜ pending |
| 31-01-02 | 01 | 1 | SUCC-02 | unit | `npx vitest run src/app/quiz/success/[jobId]/_components/RecipientEmailForm.test.tsx` | ❌ W0 | ⬜ pending |
| 31-01-03 | 01 | 1 | SUCC-03 | unit | `npx vitest run src/app/quiz/success/[jobId]/_components/RecipientEmailForm.test.tsx` | ❌ W0 | ⬜ pending |
| 31-02-01 | 02 | 1 | DASH-01 | unit | `npx vitest run src/app/dashboard/page.test.tsx` | ❌ W0 | ⬜ pending |
| 31-02-02 | 02 | 1 | DASH-02 | unit | `npx vitest run src/app/dashboard/page.test.tsx` | ❌ W0 | ⬜ pending |
| 31-02-03 | 02 | 1 | DASH-03 | unit | `npx vitest run src/app/dashboard/_components/SongCard.test.tsx` | ❌ W0 | ⬜ pending |
| 31-02-04 | 02 | 1 | DASH-04 | unit | `npx vitest run src/app/dashboard/_components/SongCard.test.tsx` | ❌ W0 | ⬜ pending |
| 31-03-01 | 03 | 2 | - | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/quiz/success/[jobId]/_components/AuthPrompt.test.tsx` — stubs for SUCC-01
- [ ] `src/app/quiz/success/[jobId]/_components/RecipientEmailForm.test.tsx` — stubs for SUCC-02, SUCC-03
- [ ] `src/app/dashboard/page.test.tsx` — stubs for DASH-01, DASH-02 (Server Component — mock createClient)
- [ ] `src/app/dashboard/_components/SongCard.test.tsx` — stubs for DASH-03, DASH-04

*Existing infrastructure covers framework install — Vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AuthPrompt never appears as modal | SUCC-01 | Visual layout verification | Open success page after generation, confirm nudge is inline below player |
| Privacy framing copy visible below input | SUCC-03 | Visual positioning | Open success page, check text appears directly beneath email input |
| Dashboard empty state displays correctly | DASH-02 | Visual — no songs scenario | Log in as new user with no songs, verify empty state message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
