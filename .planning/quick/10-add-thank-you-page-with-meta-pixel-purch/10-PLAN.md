---
phase: quick-10
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/thank-you/page.tsx
  - src/lib/stripe.ts
  - src/lib/analytics.ts
autonomous: true
requirements: [QUICK-10]
must_haves:
  truths:
    - "After Stripe checkout success, user lands on /thank-you page (not /pricing)"
    - "Meta Pixel fires Purchase event with correct value and plan name"
    - "GA4 fires purchase event with correct value and plan name"
    - "PostHog captures subscription_purchased event"
    - "Thank-you page shows plan confirmation and CTA to create a song"
  artifacts:
    - path: "src/app/thank-you/page.tsx"
      provides: "Thank-you page with conversion tracking"
    - path: "src/lib/analytics.ts"
      provides: "trackSubscriptionPurchased helper"
    - path: "src/lib/stripe.ts"
      provides: "Updated default success URL to /thank-you"
  key_links:
    - from: "src/lib/stripe.ts"
      to: "/thank-you?plan={tier}"
      via: "success_url in createCheckoutSession"
      pattern: "thank-you\\?plan="
    - from: "src/app/thank-you/page.tsx"
      to: "window.fbq"
      via: "useEffect on mount"
      pattern: "fbq.*Purchase"
    - from: "src/app/thank-you/page.tsx"
      to: "window.gtag"
      via: "useEffect on mount"
      pattern: "gtag.*purchase"
---

<objective>
Create a /thank-you page that fires Meta Pixel Purchase, GA4 purchase, and PostHog subscription_purchased events after Stripe checkout, and update the checkout flow to redirect there.

Purpose: Enable conversion tracking for Meta Ads and GA4 so ad spend ROI can be measured.
Output: New thank-you page, updated checkout redirect, new PostHog tracking helper.
</objective>

<execution_context>
@/Users/deeg/.claude/get-shit-done/workflows/execute-plan.md
@/Users/deeg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/stripe.ts
@src/lib/analytics.ts
@src/app/layout.tsx
@src/app/api/stripe/checkout/route.ts

<interfaces>
From src/lib/stripe.ts:
```typescript
export type SubscriptionTier = 'starter' | 'pro' | 'unlimited';
export const TIER_CONFIG: Record<SubscriptionTier, { songsPerMonth: number; label: string; price: string }>;
// createCheckoutSession default success_url: /pricing?success=true (to be changed)
```

From src/lib/analytics.ts:
```typescript
// All exports use posthog.capture(eventName, props) pattern
// New export needed: trackSubscriptionPurchased(plan, value)
```

From layout.tsx:
- Meta Pixel initialized with fbq('init', '949118214118377') + fbq('track', 'PageView')
- GA4 initialized with gtag('config', 'G-3YZ5B2YZC8')
- Both injected as afterInteractive Script tags — available on window globally
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add PostHog tracking helper and update Stripe success URL</name>
  <files>src/lib/analytics.ts, src/lib/stripe.ts</files>
  <action>
1. **EDIT** `src/lib/analytics.ts` — Add a new section after the Acquisition section:

```
// --- Subscription ---
export function trackSubscriptionPurchased(plan: string, value: number): void {
  posthog.capture('subscription_purchased', {
    plan,
    value,
    currency: 'USD',
  });
}
```

2. **EDIT** `src/lib/stripe.ts` — In `createCheckoutSession()`, change the default success URL logic. Currently lines 99-101:
```
const successUrl = returnPath
  ? `${origin}${returnPath}`
  : `${origin}/pricing?success=true`;
```
The tier is not available in `createCheckoutSession` — it receives `priceId`, not `tier`. Add a reverse lookup using `tierFromPriceId` (already exists in the file). Update the function:

- After `const origin = ...` line, add: `const tier = tierFromPriceId(priceId) ?? 'unknown';`
- Change the default success URL to: `` `${origin}/thank-you?plan=${tier}` ``
- Keep the `returnPath` override as-is (if caller provides returnPath, use it)
- Keep cancel URL unchanged

Final success URL logic:
```
const successUrl = returnPath
  ? `${origin}${returnPath}`
  : `${origin}/thank-you?plan=${tier}`;
```
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>analytics.ts exports trackSubscriptionPurchased; stripe.ts default success URL points to /thank-you?plan={tier}</done>
</task>

<task type="auto">
  <name>Task 2: Create /thank-you page with Meta Pixel, GA4, and PostHog conversion tracking</name>
  <files>src/app/thank-you/page.tsx</files>
  <action>
Create `src/app/thank-you/page.tsx` as a 'use client' component.

**Global type declarations** at the top of the file (before the component):
```typescript
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}
```

**Price and plan config** (matches TIER_CONFIG in stripe.ts):
```typescript
const PLAN_DETAILS: Record<string, { label: string; price: number; songs: string }> = {
  starter: { label: 'Starter', price: 3.99, songs: '1 song/month' },
  pro: { label: 'Pro', price: 9.99, songs: '3 songs/month' },
  unlimited: { label: 'Unlimited', price: 19.99, songs: 'Unlimited songs' },
};
```

**Component logic:**
- Use `useSearchParams()` to read `plan` query param
- Wrap in `<Suspense>` boundary (Next.js requirement for useSearchParams)
- Look up plan details from PLAN_DETAILS; fall back to a generic "Thank you" if plan param is missing/invalid
- `useEffect` with `useRef` guard (hasFiredRef) to prevent double-fire in React Strict Mode:
  - If `hasFiredRef.current` is true, return early
  - Set `hasFiredRef.current = true`
  - Get plan details; if not found, skip tracking
  - Meta Pixel: `window.fbq?.('track', 'Purchase', { value: price, currency: 'USD', content_name: plan })`
  - GA4: `window.gtag?.('event', 'purchase', { value: price, currency: 'USD', items: [{ item_name: plan }] })`
  - PostHog: `trackSubscriptionPurchased(plan, price)` (import from @/lib/analytics)
  - Dependency array: `[plan]`

**UI layout** (brand-consistent):
- Full-width centered container, py-16 px-4
- Checkmark circle icon (use a simple green SVG circle with checkmark, no external icon library)
- Heading: "You're all set!" in font-libre (Libre Baskerville), text-3xl
- Subtext showing plan label and songs-per-month (e.g., "Pro Plan - 3 songs/month")
- Price confirmation: "$9.99/month"
- CTA button: "Create Your First Song" linking to /quiz
  - Style: bg-[#7BAFD4] hover:bg-[#6a9ec3] text-white rounded-xl px-8 py-3 font-semibold
- Secondary link below: "Go to Dashboard" linking to /dashboard, text-[#7BAFD4] underline

Use Tailwind classes consistent with the project (font-sans for DM Sans body, font-libre for heading).
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>/thank-you page renders plan details, fires Meta Pixel Purchase + GA4 purchase + PostHog subscription_purchased exactly once on mount</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. `npm run build` succeeds (page is valid Next.js route)
3. Manual: Complete a Stripe test checkout and verify redirect lands on /thank-you?plan=starter (or pro/unlimited)
4. Manual: Check browser console / Meta Pixel Helper extension confirms Purchase event fires
</verification>

<success_criteria>
- /thank-you page exists and renders with plan-specific content
- Stripe checkout success_url redirects to /thank-you?plan={tier}
- Meta Pixel Purchase event fires once with correct value and content_name
- GA4 purchase event fires once with correct value
- PostHog subscription_purchased event fires once with plan and value
- No TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/10-add-thank-you-page-with-meta-pixel-purch/10-SUMMARY.md`
</output>
