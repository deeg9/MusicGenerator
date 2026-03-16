import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserSubscription } from '@/lib/subscription';
import { TIER_CONFIG } from '@/lib/stripe';
import { Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { SubscriptionActions } from './_components/SubscriptionActions';
import { PlanCards } from './_components/PlanCards';

const TIER_ORDER = ['starter', 'pro', 'unlimited'] as const;

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/subscription');
  }

  let subscription = null;
  try {
    subscription = await getUserSubscription(user.id);
  } catch {
    // DB timeout — show no-subscription state gracefully
  }

  const tierLabel = subscription ? (TIER_CONFIG[subscription.tier as keyof typeof TIER_CONFIG]?.label ?? subscription.tier) : null;
  const tierPrice = subscription ? (TIER_CONFIG[subscription.tier as keyof typeof TIER_CONFIG]?.price ?? '') : null;
  const isUnlimited = subscription?.songsPerMonth === -1;
  const songsUsed = subscription && !isUnlimited ? subscription.songsPerMonth - subscription.songsRemaining : 0;
  const renewalDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl md:text-4xl text-foreground mb-8">
          Manage Subscription
        </h1>

        {subscription && subscription.active ? (
          <>
            {/* Current plan summary */}
            <div className="rounded-2xl border border-border/60 bg-white p-6 md:p-8 mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-foreground">{tierLabel} Plan</h2>
                  <span className="text-sm text-muted-foreground">{tierPrice}/month</span>
                  {subscription.cancelAtPeriodEnd ? (
                    <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Canceling</span>
                  ) : (
                    <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Active</span>
                  )}
                </div>
              </div>

              {/* Usage meter */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-foreground font-medium">
                    {isUnlimited
                      ? 'Unlimited songs'
                      : `${songsUsed} of ${subscription.songsPerMonth} songs used`}
                  </span>
                  {!isUnlimited && (
                    <span className="text-muted-foreground">
                      {subscription.songsRemaining} remaining
                    </span>
                  )}
                </div>
                {!isUnlimited && (
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${subscription.songsPerMonth > 0 ? (songsUsed / subscription.songsPerMonth) * 100 : 0}%` }}
                    />
                  </div>
                )}
                {isUnlimited && (
                  <div className="h-2.5 bg-primary/20 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full w-full" />
                  </div>
                )}
              </div>

              {/* Renewal info */}
              {renewalDate && (
                <p className="text-sm text-muted-foreground">
                  {subscription.cancelAtPeriodEnd
                    ? `Your subscription ends on ${renewalDate}`
                    : `Renews on ${renewalDate}`}
                </p>
              )}
            </div>

            {/* Change plan section */}
            <div className="mb-10">
              <h2 className="font-display text-xl text-foreground mb-6">Change Plan</h2>
              <PlanCards currentTier={subscription.tier} mode="change" />
            </div>

            {/* Quick actions */}
            <SubscriptionActions hasSubscription />
          </>
        ) : (
          <>
            {/* No subscription state */}
            <div className="rounded-2xl border border-border/60 bg-white p-6 md:p-8 mb-10 text-center">
              <p className="text-lg font-medium text-foreground mb-2">
                No active subscription
              </p>
              <p className="text-sm text-muted-foreground">
                Subscribe to start creating personalized AI songs.
              </p>
            </div>

            <div className="mb-10">
              <h2 className="font-display text-xl text-foreground mb-6 text-center">Choose a Plan</h2>
              <PlanCards currentTier={null} mode="subscribe" />
            </div>
          </>
        )}

        <div className="text-center mt-8">
          <Link href="/dashboard" className="text-sm text-primary hover:underline">
            Back to My Songs
          </Link>
        </div>
      </div>
    </main>
  );
}
