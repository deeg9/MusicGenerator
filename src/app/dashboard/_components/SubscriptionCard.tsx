'use client';

import Link from 'next/link';
import type { SubscriptionInfo } from '@/lib/subscription';

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  unlimited: 'Unlimited',
};

export function SubscriptionCard({ subscription }: { subscription: SubscriptionInfo | null }) {
  if (!subscription) {
    return (
      <div className="rounded-xl border border-border/60 bg-white p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">No active subscription</p>
          <p className="text-xs text-muted-foreground mt-0.5">Subscribe to start creating songs</p>
        </div>
        <Link
          href="/pricing"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          View Plans
        </Link>
      </div>
    );
  }

  const tierLabel = TIER_LABELS[subscription.tier] ?? subscription.tier;
  const isUnlimited = subscription.songsPerMonth === -1;
  const renewalDate = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  async function handleManage() {
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{tierLabel} Plan</span>
          {subscription.active && (
            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">Active</span>
          )}
          {!subscription.active && (
            <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-medium">
              {subscription.cancelAtPeriodEnd ? 'Canceling' : 'Inactive'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {subscription.tier === 'starter' && (
            <Link
              href="/pricing"
              className="text-xs text-primary font-medium hover:underline"
            >
              Upgrade
            </Link>
          )}
          <button
            type="button"
            onClick={handleManage}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Manage
          </button>
        </div>
      </div>
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span>
          Songs: {isUnlimited ? 'Unlimited' : `${subscription.songsRemaining} of ${subscription.songsPerMonth} remaining`}
        </span>
        {renewalDate && (
          <span>
            {subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'}: {renewalDate}
          </span>
        )}
      </div>
    </div>
  );
}
