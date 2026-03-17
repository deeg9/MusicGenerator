import Stripe from 'stripe';

/** Ensure origin has an explicit scheme — Stripe rejects URLs without one. */
function ensureScheme(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

// Lazy-initialized to avoid build-time crash when env vars aren't set
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });
  }
  return _stripe;
}

/** @deprecated Use getStripe() — kept for convenience in existing code */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ── Price ID mapping ────────────────────────────────────────────────────────

function getPriceIds() {
  return {
    starter: process.env.STRIPE_PRICE_STARTER!,
    pro: process.env.STRIPE_PRICE_PRO!,
    unlimited: process.env.STRIPE_PRICE_UNLIMITED!,
  };
}

export const PRICE_IDS = new Proxy({} as { starter: string; pro: string; unlimited: string }, {
  get(_, prop: string) {
    return getPriceIds()[prop as keyof ReturnType<typeof getPriceIds>];
  },
});

export type SubscriptionTier = keyof typeof PRICE_IDS;

export const TIER_CONFIG: Record<SubscriptionTier, { songsPerMonth: number; label: string; price: string }> = {
  starter: { songsPerMonth: 1, label: 'Starter', price: '$3.99' },
  pro: { songsPerMonth: 3, label: 'Pro', price: '$9.99' },
  unlimited: { songsPerMonth: -1, label: 'Unlimited', price: '$19.99' },
};

export function tierFromPriceId(priceId: string): SubscriptionTier | null {
  for (const [tier, id] of Object.entries(PRICE_IDS)) {
    if (id === priceId) return tier as SubscriptionTier;
  }
  return null;
}

// ── Customer helpers ────────────────────────────────────────────────────────

export async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  // Search for existing customer by metadata
  const existing = await stripe.customers.list({
    limit: 1,
    email,
  });

  if (existing.data.length > 0 && existing.data[0].metadata?.userId === userId) {
    return existing.data[0].id;
  }

  // Also search by metadata in case email changed
  const byMetadata = await stripe.customers.search({
    query: `metadata["userId"]:"${userId}"`,
    limit: 1,
  });

  if (byMetadata.data.length > 0) {
    return byMetadata.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  return customer.id;
}

// ── Checkout session ────────────────────────────────────────────────────────

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  returnPath?: string,
): Promise<string> {
  const origin = ensureScheme(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  const tier = tierFromPriceId(priceId) ?? 'unknown';

  const successUrl = returnPath
    ? `${origin}${returnPath}`
    : `${origin}/thank-you?plan=${tier}`;
  const cancelUrl = returnPath
    ? `${origin}${returnPath}`
    : `${origin}/pricing?canceled=true`;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { userId },
    },
    metadata: { userId },
  });

  return session.url!;
}

// ── Customer Portal ─────────────────────────────────────────────────────────

export async function createPortalSession(customerId: string): Promise<string> {
  const origin = ensureScheme(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard`,
  });

  return session.url;
}
