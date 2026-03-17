# Quick Task 12: Fix stale subscription data — always re-sync from Stripe

## Problem
After the tierFromPriceId Proxy bug fix (quick task 11), existing DB rows still had incorrect data ("starter" instead of "pro"). The `getUserSubscription()` function only re-syncs from Stripe when there's NO local record, so stale records were never corrected.

## Fix
Added `syncSubscriptionFromStripe(user.id)` call to `/api/subscription/check` before reading local data. This ensures every dashboard load refreshes the local DB from Stripe's source of truth.

## File changed
- `src/app/api/subscription/check/route.ts` — added import + sync call (4 lines)

## Commit
- `2be8684`: fix: always re-sync subscription from Stripe on dashboard load
