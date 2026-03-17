# Quick Task 13: Fix subscription upgrade stacking

## Problem
Each "upgrade" click created a NEW Stripe subscription without canceling the old one. seller@example.com ended up with 4 active subscriptions (Starter, Pro, Pro, Unlimited) and $43.96 charged. The sync function could pick the wrong subscription.

## Fixes
1. **`src/app/api/stripe/checkout/route.ts`** — now cancels all existing active subscriptions before creating a new checkout session
2. **`src/lib/stripe-sync.ts`** — `syncSubscriptionFromStripe` now fetches ALL active subs and picks the highest-tier one (unlimited > pro > starter) instead of `limit: 1`

## Manual cleanup needed
- In Stripe dashboard: cancel seller@example.com's 3 old subscriptions (keep only Unlimited)
- Consider refunding the duplicate charges ($3.99 + $9.99 + $9.99 = $23.97)

## Commit
- `81119db`: fix: cancel existing subs on upgrade + sync picks highest tier
