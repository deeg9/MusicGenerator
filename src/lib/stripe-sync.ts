import { stripe, tierFromPriceId, TIER_CONFIG } from '@/lib/stripe';
import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

// Stripe's newer API versions may not expose these on the TS types,
// but they're still present at runtime in webhook payloads.
export type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
};

export function getPeriodDates(sub: SubscriptionWithPeriod) {
  return {
    start: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
    end: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
  };
}

export function mapStripeStatus(status: Stripe.Subscription.Status): 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive' {
  switch (status) {
    case 'active': return 'active';
    case 'trialing': return 'trialing';
    case 'past_due': return 'past_due';
    case 'canceled':
    case 'unpaid': return 'canceled';
    default: return 'inactive';
  }
}

export async function upsertSubscription(
  stripeSubscription: SubscriptionWithPeriod,
  userId: string,
  customerId: string,
) {
  const priceId = stripeSubscription.items.data[0]?.price.id;
  const tier = tierFromPriceId(priceId ?? '') ?? 'starter';
  const config = TIER_CONFIG[tier];
  const period = getPeriodDates(stripeSubscription);

  const values = {
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: stripeSubscription.id,
    stripePriceId: priceId ?? null,
    tier: tier as 'starter' | 'pro' | 'unlimited',
    status: mapStripeStatus(stripeSubscription.status),
    songsPerMonth: config.songsPerMonth,
    songsRemaining: config.songsPerMonth,
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: subscriptions.id, tier: subscriptions.tier })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing) {
    const tierChanged = existing.tier !== tier;
    if (tierChanged) {
      // Tier changed (upgrade/downgrade) — reset credits to new tier's allocation
      await db.update(subscriptions).set(values).where(eq(subscriptions.id, existing.id));
    } else {
      // Same tier — sync metadata but preserve songsRemaining (don't reset credits)
      const { songsRemaining: _, ...updateValues } = values;
      await db.update(subscriptions).set(updateValues).where(eq(subscriptions.id, existing.id));
    }
  } else {
    // New subscription — start with full credits
    await db.insert(subscriptions).values(values);
  }
}

/**
 * Look up a Stripe customer by userId metadata and sync their active
 * subscription into the local DB. Returns true if a subscription was found
 * and synced.
 */
export async function syncSubscriptionFromStripe(userId: string): Promise<boolean> {
  try {
    const customers = await stripe.customers.search({
      query: `metadata["userId"]:"${userId}"`,
      limit: 1,
    });

    if (customers.data.length === 0) return false;

    const customer = customers.data[0];
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
    });

    // Pick the highest-tier subscription when multiples exist (defensive)
    const tierRank: Record<string, number> = { unlimited: 3, pro: 2, starter: 1 };
    let sub = subs.data[0];
    let bestRank = 0;
    for (const s of subs.data) {
      const priceId = s.items.data[0]?.price.id;
      const tier = tierFromPriceId(priceId ?? '');
      const rank = tier ? tierRank[tier] ?? 0 : 0;
      if (rank > bestRank) {
        bestRank = rank;
        sub = s;
      }
    }

    // Also check trialing if no active
    if (!sub) {
      const trialingSubs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'trialing',
        limit: 1,
      });
      sub = trialingSubs.data[0];
    }

    if (!sub) return false;

    await upsertSubscription(sub as SubscriptionWithPeriod, userId, customer.id);
    console.log(`[stripe-sync] Backfilled subscription for user ${userId} from Stripe`);
    return true;
  } catch (err) {
    console.error('[stripe-sync] Failed to sync from Stripe:', err);
    return false;
  }
}
