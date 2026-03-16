---
phase: quick
plan: 3
subsystem: legal
tags: [privacy, terms, cookie-consent, gdpr, ccpa, legal-compliance]
dependency_graph:
  requires: []
  provides: [privacy-policy, terms-of-service, cookie-consent-banner]
  affects: [src/app/layout.tsx]
tech_stack:
  added: []
  patterns: [server-component-legal-pages, client-cookie-consent, localStorage-persistence]
key_files:
  created:
    - src/app/privacy/page.tsx
    - src/app/terms/page.tsx
    - src/components/CookieConsent.tsx
  modified:
    - src/app/layout.tsx
decisions:
  - Legal pages implemented as TSX Server Components (no MDX, no new dependencies)
  - Cookie consent uses localStorage (not cookies) for the consent preference itself
  - CookieConsent uses requestAnimationFrame for entrance animation timing instead of setTimeout
  - Privacy policy uses plain accessible language rather than dense legalese
  - Recipient emails documented with 90-day retention cap for GDPR compliance
metrics:
  duration: ~4 minutes
  completed: "2026-03-16"
  tasks: 2
  files_created: 3
  files_modified: 1
---

# Quick Task 3: Professional Privacy Policy and Cookie Consent Summary

**One-liner:** GDPR/CCPA-compliant privacy policy and terms of service with a localStorage-persisted cookie consent banner, covering all 6 third-party services (Supabase, Vercel, Cloudflare R2, RunPod, Google Gemini, Resend).

## What Was Built

### Task 1: Privacy Policy and Terms of Service Pages

Replaced placeholder "Coming soon" pages with fully written legal content.

**Privacy Policy** (`src/app/privacy/page.tsx` — 500 lines, 13 sections):

1. Introduction — service description, effective date, scope
2. Information We Collect — account data, quiz responses, recipient emails, generated content, usage/device data, cookies
3. How We Use Your Information — generation, delivery, improvement, communication, abuse prevention, legal compliance; GDPR legal bases stated
4. Third-Party Services — dedicated subsections for each of: Supabase (auth/DB, us-west-2, SOC 2), Vercel (hosting/edge), Cloudflare R2 (audio storage), RunPod (AI compute — clarifies no PII sent), Google Gemini (quiz responses → lyrics), Resend (email delivery); links to each provider's privacy policy
5. Cookies and Tracking — essential cookies (Supabase auth session, consent localStorage), non-essential policy (none currently), browser management instructions
6. Data Retention — account data, audio files, quiz responses, recipient emails (90 days), log data (90 days)
7. Your Rights (GDPR) — access, rectification, erasure, restriction, portability, objection, consent withdrawal, supervisory authority complaint
8. Your Rights (CCPA) — right to know, delete, correct, opt-out of sale (stated: we do not sell), limit sensitive PI, non-discrimination; 45-day response timeline; CCPA categories table
9. Children's Privacy — COPPA compliance, under-13 prohibition, parental notification process
10. Data Security — HTTPS, Supabase auth, R2 presigned URLs, RLS policies, access controls, honest "no method is 100% secure" disclosure
11. International Data Transfers — US-based processing, SCCs for EEA/UK/Switzerland transfers
12. Changes to This Policy — update date, email notification, website notice
13. Contact Us — links to /contact

**Terms of Service** (`src/app/terms/page.tsx` — 321 lines, 13 sections):

1. Acceptance of Terms — binding agreement, age requirement (13+), organizational use
2. Service Description — quiz, generation, playback, download, email delivery, dashboard; AI probabilistic output disclaimer
3. User Accounts — anonymous vs authenticated use, account responsibilities, credential security
4. Acceptable Use — 9 prohibited categories (hate speech, violence, spam, unauthorized access, impersonation, commercial redistribution without permission, etc.)
5. Intellectual Property — platform IP (Notevra owns), generated songs (personal non-commercial license), AI content limitations and evolving legal landscape, quiz inputs (user retains; limited license for processing)
6. Content Guidelines — hate speech, violence, explicit content, third-party PII, AI jailbreaking prohibited
7. Service Availability — no uptime guarantee, AI provider dependency, right to modify/discontinue
8. Disclaimer and Limitation of Liability — AS IS warranty disclaimer (all-caps), consequential damages exclusion, $50 cap
9. Indemnification — user indemnifies Notevra for violations, infringement, law violations
10. Governing Law — Delaware/US law, good-faith negotiation first, EU consumer rights preserved
11. Changes to Terms — update date, email notification, continued use = acceptance
12. General Provisions — entire agreement, severability, waiver, assignment
13. Contact Us — link to /contact

Both pages include Next.js `metadata` exports, effective date display, and the established design system styling (container, font-display headings, muted-foreground body text, primary-colored links).

### Task 2: Cookie Consent Banner

**`src/components/CookieConsent.tsx`** — 'use client' component (70 lines):

- Checks `localStorage.getItem('notevra-cookie-consent')` on mount
- If no value found, sets `visible = true` and triggers slide-up entrance animation via `requestAnimationFrame` + Tailwind `translate-y-full → translate-y-0` transition
- Renders fixed-bottom banner: informational text + "Learn more" link to /privacy + "Decline" button (outline) + "Accept" button (primary fill)
- Accept: sets localStorage to 'accepted', hides banner
- Decline: sets localStorage to 'declined', hides banner
- Banner does not reappear on subsequent visits while preference is stored
- Zero new npm dependencies — pure React + Tailwind + localStorage

**`src/app/layout.tsx`** — added `<CookieConsent />` after `<Footer />` inside body.

## Deviations from Plan

None — plan executed exactly as written.

The only minor implementation detail worth noting: the entrance animation uses `requestAnimationFrame` (vs a `setTimeout` delay) for the translate trigger, which is the correct browser-native approach to ensure the initial `translate-y-full` class is painted before the transition fires. This is functionally equivalent to what the plan described.

## Self-Check: PASSED

- src/app/privacy/page.tsx: FOUND (500 lines, exceeds 150-line minimum)
- src/app/terms/page.tsx: FOUND (321 lines, exceeds 100-line minimum)
- src/components/CookieConsent.tsx: FOUND (70 lines, exceeds 30-line minimum)
- src/app/layout.tsx: modified — imports CookieConsent, renders after Footer
- Commit 959e249: feat(quick-3): comprehensive privacy policy and terms of service pages
- Commit 23d9cad: feat(quick-3): cookie consent banner with localStorage persistence
- Build: passes without errors on both task completions
