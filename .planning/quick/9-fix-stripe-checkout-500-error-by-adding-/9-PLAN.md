---
phase: quick-9
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/lib/stripe.ts]
autonomous: true
requirements: [QUICK-9]

must_haves:
  truths:
    - "Stripe checkout session creation succeeds when NEXT_PUBLIC_SITE_URL lacks a scheme"
    - "Stripe portal session creation succeeds when NEXT_PUBLIC_SITE_URL lacks a scheme"
    - "Localhost fallback still works when NEXT_PUBLIC_SITE_URL is unset"
  artifacts:
    - path: "src/lib/stripe.ts"
      provides: "URL scheme normalization for Stripe redirect URLs"
      contains: "https://"
  key_links:
    - from: "src/lib/stripe.ts"
      to: "Stripe API"
      via: "success_url / cancel_url / return_url params"
      pattern: "origin.*https"
---

<objective>
Fix Stripe checkout 500 error caused by NEXT_PUBLIC_SITE_URL missing the https:// scheme in production.

Purpose: Stripe requires explicit URL schemes for redirect URLs. When NEXT_PUBLIC_SITE_URL is set to a bare domain (e.g., "notevra.net"), the Stripe API rejects it.
Output: Defensive URL normalization in both createCheckoutSession and createPortalSession.
</objective>

<execution_context>
@/Users/deeg/.claude/get-shit-done/workflows/execute-plan.md
@/Users/deeg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/stripe.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add defensive URL scheme normalization to stripe.ts</name>
  <files>src/lib/stripe.ts</files>
  <action>
Extract a helper function at module level in stripe.ts:

```typescript
/** Ensure origin has an explicit scheme — Stripe rejects URLs without one. */
function ensureScheme(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}
```

Then update both functions:

1. **createCheckoutSession** (line 91): Replace `const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';` with:
   ```typescript
   const origin = ensureScheme(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
   ```

2. **createPortalSession** (line 118): Same replacement:
   ```typescript
   const origin = ensureScheme(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
   ```

The helper preserves existing http:// and https:// URLs unchanged, only prepending https:// when no scheme is present. The localhost fallback already has http:// so it passes through untouched.
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit src/lib/stripe.ts 2>&1 | head -20</automated>
  </verify>
  <done>Both createCheckoutSession and createPortalSession produce valid scheme-prefixed URLs regardless of whether NEXT_PUBLIC_SITE_URL includes a scheme. TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes for stripe.ts
- Manual grep confirms both origin assignments use ensureScheme()
- No other files modified
</verification>

<success_criteria>
- stripe.ts contains ensureScheme helper
- Both createCheckoutSession and createPortalSession use ensureScheme
- TypeScript compiles cleanly
- Bare domain values like "notevra.net" get https:// prepended
- Existing http:// and https:// URLs pass through unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/9-fix-stripe-checkout-500-error-by-adding-/9-SUMMARY.md`
</output>
