import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateCustomer, createCheckoutSession, PRICE_IDS } from '@/lib/stripe';
import type { SubscriptionTier } from '@/lib/stripe';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: { tier?: string; returnTo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tier = body.tier as SubscriptionTier;
  if (!tier || !PRICE_IDS[tier]) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  // Validate returnTo is a relative path (prevent open redirect)
  const returnTo = body.returnTo && body.returnTo.startsWith('/') ? body.returnTo : undefined;

  const customerId = await getOrCreateCustomer(user.id, user.email);
  const checkoutUrl = await createCheckoutSession(customerId, PRICE_IDS[tier], user.id, returnTo);

  return NextResponse.json({ url: checkoutUrl });
}
