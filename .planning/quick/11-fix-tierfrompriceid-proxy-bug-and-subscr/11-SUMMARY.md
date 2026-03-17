# Quick Task 11: Fix tierFromPriceId Proxy bug and subscription credits

## What was wrong

**Bug 1 — `?plan=unknown`:** `tierFromPriceId()` used `Object.entries(PRICE_IDS)` to iterate price IDs, but `PRICE_IDS` is a JavaScript Proxy with an empty `{}` target. `Object.entries()` reads the target's own properties (empty), not the Proxy's get trap. Result: every tier lookup returned `null` → fallback `'unknown'`.

**Bug 2 — Starter instead of Pro, 0 credits:** Same root cause — `tierFromPriceId` failed in `upsertSubscription`, so `?? 'starter'` fallback kicked in. Additionally, `customer.subscription.updated` webhook set `songsPerMonth` but forgot `songsRemaining`, so credits stayed at 0.

## Fixes

1. **`src/lib/stripe.ts`** — `tierFromPriceId()` now calls `getPriceIds()` directly (returns a real object) instead of iterating the Proxy.
2. **`src/app/api/stripe/webhook/route.ts`** — `customer.subscription.updated` handler now also sets `songsRemaining: config.songsPerMonth`.

## Commit

- `25f2cbb`: fix: tierFromPriceId Proxy iteration bug + webhook missing songsRemaining
