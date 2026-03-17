---
phase: quick-9
plan: "01"
subsystem: payments
tags: [stripe, url-normalization, bug-fix]
dependency_graph:
  requires: []
  provides: [stripe-url-scheme-normalization]
  affects: [src/lib/stripe.ts]
tech_stack:
  added: []
  patterns: [defensive-url-normalization]
key_files:
  created: []
  modified:
    - src/lib/stripe.ts
decisions:
  - "ensureScheme helper placed at module level (not inline) for reuse across both session functions"
  - "localhost fallback preserves http:// scheme — ensureScheme passes it through unchanged"
metrics:
  duration: "<1 minute"
  completed: "2026-03-16"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-9: Fix Stripe Checkout 500 Error (URL Scheme) Summary

**One-liner:** Added `ensureScheme()` helper to `stripe.ts` that prepends `https://` when `NEXT_PUBLIC_SITE_URL` is a bare domain like `notevra.net`, fixing Stripe API 500 errors on redirect URL validation.

## What Was Built

A single module-level helper function `ensureScheme(url: string): string` in `src/lib/stripe.ts`, applied to the `origin` variable in both `createCheckoutSession` and `createPortalSession`. Stripe rejects redirect URLs without an explicit scheme — this fix normalizes bare domains before they reach the API.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add defensive URL scheme normalization to stripe.ts | f77749f | src/lib/stripe.ts |

## Success Criteria Met

- [x] stripe.ts contains `ensureScheme` helper
- [x] Both `createCheckoutSession` and `createPortalSession` use `ensureScheme`
- [x] TypeScript compiles cleanly for stripe.ts (no errors)
- [x] Bare domain values like "notevra.net" get `https://` prepended
- [x] Existing `http://` and `https://` URLs pass through unchanged
- [x] Localhost fallback `http://localhost:3000` preserved correctly

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `src/lib/stripe.ts` exists and contains `ensureScheme`
- [x] Commit `f77749f` exists
- [x] No TypeScript errors in stripe.ts
