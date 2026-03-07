---
phase: 29
slug: database-schema-song-persistence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:unit -- --reporter=dot` |
| **Full suite command** | `npm run test:unit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- --reporter=dot`
- **After every plan wave:** Run `npm run test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | SONG-01 | unit | `npm run test:unit -- src/db/schema.test.ts` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 1 | SONG-01 | manual | `npx drizzle-kit push --verbose` | N/A | ⬜ pending |
| 29-02-01 | 02 | 1 | SONG-02 | unit | `npm run test:unit -- src/app/api/quiz-generate/route.test.ts` | ✅ (expand) | ⬜ pending |
| 29-02-02 | 02 | 1 | SONG-02 | unit | `npm run test:unit -- src/app/api/quiz-generate/route.test.ts` | ✅ (expand) | ⬜ pending |
| 29-02-03 | 02 | 1 | SONG-02 | unit | `npm run test:unit -- src/app/api/poll-job/[jobId]/route.test.ts` | ✅ (expand) | ⬜ pending |
| 29-02-04 | 02 | 1 | SONG-03 | unit | `npm run test:unit -- src/db/schema.test.ts` | ❌ W0 | ⬜ pending |
| 29-02-05 | 02 | 2 | SONG-04 | unit | `npm run test:unit -- src/app/signup/actions.test.ts` | ✅ (stubs) | ⬜ pending |
| 29-02-06 | 02 | 2 | SONG-04 | unit | `npm run test:unit -- src/app/signup/actions.test.ts` | ✅ (stubs) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/db/schema.test.ts` — verifies songs table exports, enum values, pgPolicy names (SONG-01, SONG-03)
- [ ] `src/db/__mocks__/index.ts` — shared mock for `db` export used by quiz-generate, poll-job, and signup tests

*Existing test files for quiz-generate/route.test.ts, poll-job/route.test.ts, and signup/actions.test.ts exist but need expansion for the new DB behavior*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| drizzle-kit push applies schema | SONG-01 | One-time migration against live DB | Run `npx drizzle-kit push --verbose`, verify no errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
