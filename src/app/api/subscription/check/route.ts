import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserSubscription } from '@/lib/subscription';
import { syncSubscriptionFromStripe } from '@/lib/stripe-sync';

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Always re-sync from Stripe to self-heal stale/incorrect local data
  await syncSubscriptionFromStripe(user.id);

  const sub = await getUserSubscription(user.id);

  if (!sub) {
    return NextResponse.json(
      { active: false, tier: null, songsRemaining: 0, songsPerMonth: 0 },
      { status: 404 },
    );
  }

  return NextResponse.json({
    active: sub.active,
    tier: sub.tier,
    songsRemaining: sub.songsRemaining,
    songsPerMonth: sub.songsPerMonth,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
  });
}
