import { NextRequest, NextResponse } from 'next/server';
import { stripe, tierFromPriceId, TIER_CONFIG } from '@/lib/stripe';
import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Stripe's newer API versions may not expose these on the TS types,
// but they're still present at runtime in webhook payloads.
type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
};

type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | null;
};

function getPeriodDates(sub: SubscriptionWithPeriod) {
  return {
    start: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
    end: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
  };
}

async function upsertSubscription(
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
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing) {
    await db.update(subscriptions).set(values).where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values(values);
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive' {
  switch (status) {
    case 'active': return 'active';
    case 'trialing': return 'trialing';
    case 'past_due': return 'past_due';
    case 'canceled':
    case 'unpaid': return 'canceled';
    default: return 'inactive';
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription' || !session.subscription || !session.customer) break;

        const userId = session.metadata?.userId;
        if (!userId) {
          console.error('[stripe-webhook] No userId in checkout session metadata');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await upsertSubscription(
          subscription as SubscriptionWithPeriod,
          userId,
          typeof session.customer === 'string' ? session.customer : session.customer.id,
        );
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as SubscriptionWithPeriod;
        const userId = subscription.metadata?.userId;
        if (!userId) {
          console.error('[stripe-webhook] No userId in subscription metadata');
          break;
        }

        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

        const priceId = subscription.items.data[0]?.price.id;
        const tier = tierFromPriceId(priceId ?? '') ?? 'starter';
        const config = TIER_CONFIG[tier];
        const period = getPeriodDates(subscription);

        await db
          .update(subscriptions)
          .set({
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId ?? null,
            tier: tier as 'starter' | 'pro' | 'unlimited',
            status: mapStripeStatus(subscription.status),
            songsPerMonth: config.songsPerMonth,
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeCustomerId, customerId));
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

        await db
          .update(subscriptions)
          .set({
            status: 'inactive',
            songsRemaining: 0,
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeCustomerId, customerId));
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as InvoiceWithSubscription;
        if (!invoice.subscription) break;

        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as { id: string } | null)?.id;
        if (!customerId) break;

        const [sub] = await db
          .select({ songsPerMonth: subscriptions.songsPerMonth })
          .from(subscriptions)
          .where(eq(subscriptions.stripeCustomerId, customerId))
          .limit(1);

        if (sub) {
          await db
            .update(subscriptions)
            .set({
              status: 'active',
              songsRemaining: sub.songsPerMonth,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.stripeCustomerId, customerId));
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as InvoiceWithSubscription;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as { id: string } | null)?.id;
        if (!customerId) break;

        await db
          .update(subscriptions)
          .set({
            status: 'past_due',
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeCustomerId, customerId));
        break;
      }
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error handling ${event.type}:`, err);
  }

  return NextResponse.json({ received: true });
}
