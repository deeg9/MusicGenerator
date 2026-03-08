---
phase: 32
slug: google-oauth-sign-in-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:unit -- --reporter=verbose` |
| **Full suite command** | `npm run test:unit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- --reporter=verbose`
- **After every plan wave:** Run `npm run test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | OAUTH-01 | unit | `npm run test:unit -- src/app/login/actions.test.ts` | ❌ W0 | ⬜ pending |
| 32-01-02 | 01 | 1 | OAUTH-02 | unit | `npm run test:unit -- src/app/auth/callback/route.test.ts` | ❌ W0 | ⬜ pending |
| 32-01-03 | 01 | 1 | OAUTH-03 | unit | `npm run test:unit -- src/app/auth/callback/route.test.ts` | ❌ W0 | ⬜ pending |
| 32-01-04 | 01 | 1 | OAUTH-04 | unit | `npm run test:unit -- src/app/auth/callback/route.test.ts` | ❌ W0 | ⬜ pending |
| 32-02-01 | 02 | 1 | OAUTH-04 | unit | `npm run test:unit -- src/app/login/page.test.tsx` | ❌ W0 | ⬜ pending |
| 32-02-02 | 02 | 1 | OAUTH-06 | unit | `npm run test:unit -- src/app/signup/page.test.tsx` | ❌ W0 | ⬜ pending |
| 32-03-01 | 03 | 2 | OAUTH-05 | manual | Human UAT — Supabase + Google Console config | manual-only | ⬜ pending |
| 32-03-02 | 03 | 2 | OAUTH-07 | manual | Human UAT — full OAuth round-trip | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/auth/callback/route.test.ts` — stubs for OAUTH-02, OAUTH-03, OAUTH-04
- [ ] `src/app/login/actions.test.ts` — extend with OAUTH-01 stub (or create if missing)
- [ ] `src/app/login/page.test.tsx` — extend with OAUTH-05 stub (or create if missing)
- [ ] `src/app/signup/page.test.tsx` — extend with OAUTH-06 stub (or create if missing)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase + Google Console configured | OAUTH-05 | External dashboard config — cannot be automated | Follow documented steps, verify provider toggle is green |
| Full OAuth round-trip | OAUTH-07 | Requires real Google account and browser consent | Click "Continue with Google", complete consent, verify redirect to dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
