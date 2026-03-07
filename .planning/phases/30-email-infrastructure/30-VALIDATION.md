---
phase: 30
slug: email-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x with jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run test:unit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm run test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | EMAIL-01 | manual-only | n/a (dashboard config) | n/a | ⬜ pending |
| 30-02-01 | 02 | 2 | EMAIL-04 | unit (render smoke) | `npm run test:unit -- src/emails/SongReadyEmail.test.tsx` | ❌ W0 | ⬜ pending |
| 30-02-02 | 02 | 2 | EMAIL-04 | unit (render smoke) | `npm run test:unit -- src/emails/GiftDeliveryEmail.test.tsx` | ❌ W0 | ⬜ pending |
| 30-03-01 | 03 | 2 | EMAIL-02 | unit | `npm run test:unit -- src/app/api/send-creator-email/route.test.ts` | ❌ W0 | ⬜ pending |
| 30-03-02 | 03 | 2 | EMAIL-03 | unit | `npm run test:unit -- src/app/api/send-recipient-email/route.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/emails/SongReadyEmail.test.tsx` — smoke render test for EMAIL-04
- [ ] `src/emails/GiftDeliveryEmail.test.tsx` — smoke render test for EMAIL-04
- [ ] `src/app/api/send-creator-email/route.test.ts` — covers EMAIL-02 (mock Resend + Drizzle + R2)
- [ ] `src/app/api/send-recipient-email/route.test.ts` — covers EMAIL-03 (mock Resend + Drizzle + R2)

*Existing vitest infrastructure covers framework needs. No new install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase auth emails route through Resend SMTP | EMAIL-01 | Requires Supabase dashboard config + DNS verification — no API to automate | 1. Configure SMTP in Supabase dashboard 2. Trigger password reset 3. Check inbox for Resend-delivered email |
| Emails render correctly in Gmail, Apple Mail, Outlook | EMAIL-04 | Cross-client rendering requires visual inspection | 1. Send test emails via API routes 2. Open in Gmail, Apple Mail, Outlook 3. Verify baby blue header, Libre Baskerville heading, no broken layout |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
