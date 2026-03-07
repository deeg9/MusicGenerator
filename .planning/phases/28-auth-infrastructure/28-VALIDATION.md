---
phase: 28
slug: auth-infrastructure
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-06
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 + @testing-library/react ^16.3.2 |
| **Config file** | `vitest.config.ts` (exists at project root) |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run test:unit` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm run test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | AUTH-05 | unit (mocked) | `npm run test:unit` | N/A (infra) | ⬜ pending |
| 28-01-02 | 01 | 1 | AUTH-05 | unit (mocked) | `npm run test:unit` | N/A (schemas) | ⬜ pending |
| 28-01-03 | 01 | 1 | Wave 0 | test stubs | `npm run test:unit` | ❌ Created by this task | ⬜ pending |
| 28-02-01 | 02 | 2 | AUTH-01, AUTH-03, AUTH-06 | unit (mocked) | `npm run test:unit` | ⬜ Stub from 28-01-03 | ⬜ pending |
| 28-02-02 | 02 | 2 | AUTH-04, AUTH-07, AUTH-08 | unit (mocked) | `npm run test:unit` | ⬜ Stub from 28-01-03 | ⬜ pending |
| 28-03-01 | 03 | 2 | AUTH-09 | unit | `npm run test:unit` | ⚠️ Partial (Header.test.tsx) | ⬜ pending |
| 28-03-02 | 03 | 2 | AUTH-09 | unit | `npm run test:unit` | ⚠️ Updated by this task | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All created by Plan 01 Task 3:

- [ ] `src/lib/supabase/__mocks__/server.ts` — shared mock for createClient (server) with all auth method stubs
- [ ] `src/lib/supabase/__mocks__/client.ts` — shared mock for createClient (browser)
- [ ] `src/app/signup/actions.test.ts` — unit tests for signup() server action (mock Supabase client)
- [ ] `src/app/login/actions.test.ts` — unit tests for login() and signOut() server actions
- [ ] `src/app/forgot-password/actions.test.ts` — unit tests for resetPassword() server action
- [ ] `src/app/update-password/actions.test.ts` — unit tests for updatePassword() server action
- [ ] `src/app/auth/confirm/route.test.ts` — unit tests for PKCE callback route handler
- [ ] `src/app/auth/error/page.test.tsx` — render test for error page with searchParam
- [ ] Update `src/components/Header.test.tsx` — add `user` prop, add auth state tests (done in Plan 03 Task 2)

*Existing infrastructure covers test framework — only test files need creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email confirmation disabled | AUTH-02 | Supabase Dashboard config, not code | Check Authentication > Providers > Email toggle |
| Session persists across browser refresh | AUTH-05 | Requires real browser cookies | Log in, close tab, reopen — should still be logged in |
| Password reset email arrives | AUTH-04 | Requires Resend SMTP delivery | Request reset, check inbox for email link |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 01 Task 3)
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
