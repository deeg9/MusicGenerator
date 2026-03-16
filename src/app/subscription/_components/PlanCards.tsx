'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Sparkles } from 'lucide-react';

const PLANS = [
  {
    tier: 'starter',
    name: 'Starter',
    price: '$3.99',
    period: '/month',
    songs: '1 song per month',
    features: [
      '1 personalized AI song',
      'Full MP3 download',
      'Share link included',
    ],
    popular: false,
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    songs: '3 songs per month',
    features: [
      '3 personalized AI songs',
      'Full MP3 download',
      'Share link included',
      'Priority generation',
    ],
    popular: true,
  },
  {
    tier: 'unlimited',
    name: 'Unlimited',
    price: '$19.99',
    period: '/month',
    songs: 'Unlimited songs',
    features: [
      'Unlimited AI songs',
      'Full MP3 download',
      'Share link included',
      'Priority generation',
      'Early access to new features',
    ],
    popular: false,
  },
] as const;

const TIER_ORDER = ['starter', 'pro', 'unlimited'];

export function PlanCards({ currentTier, mode }: { currentTier: string | null; mode: 'change' | 'subscribe' }) {
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  async function handleSubscribe(tier: string) {
    setLoadingTier(tier);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      if (res.status === 401) {
        router.push('/login?next=/subscription');
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoadingTier(null);
    }
  }

  async function handleChangePlan() {
    setLoadingTier('portal');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } finally {
      setLoadingTier(null);
    }
  }

  const currentIndex = currentTier ? TIER_ORDER.indexOf(currentTier) : -1;

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {PLANS.map((plan) => {
        const isCurrent = plan.tier === currentTier;
        const planIndex = TIER_ORDER.indexOf(plan.tier);
        const isUpgrade = currentTier && planIndex > currentIndex;
        const isDowngrade = currentTier && planIndex < currentIndex;

        return (
          <div
            key={plan.tier}
            className={`relative rounded-2xl border p-6 flex flex-col ${
              isCurrent
                ? 'border-primary bg-primary/[0.03] shadow-lg ring-2 ring-primary/20'
                : plan.popular && !currentTier
                  ? 'border-primary bg-primary/[0.03] shadow-lg ring-2 ring-primary/20'
                  : 'border-border/60 bg-white shadow-sm'
            }`}
          >
            {isCurrent && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold">
                Current Plan
              </div>
            )}
            {!currentTier && plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Most Popular
              </div>
            )}

            <div className="mb-6">
              <h3 className="font-display text-xl text-foreground mb-1">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.songs}</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-foreground">{plan.price}</span>
              <span className="text-muted-foreground text-sm">{plan.period}</span>
            </div>

            <ul className="flex flex-col gap-3 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            {mode === 'subscribe' ? (
              <button
                onClick={() => handleSubscribe(plan.tier)}
                disabled={loadingTier !== null}
                className={`w-full rounded-full py-3 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
                    : 'bg-foreground text-background hover:bg-foreground/90'
                }`}
              >
                {loadingTier === plan.tier ? 'Redirecting...' : 'Subscribe'}
              </button>
            ) : isCurrent ? (
              <div className="w-full rounded-full py-3 text-sm font-bold text-center text-muted-foreground bg-muted cursor-default">
                Current Plan
              </div>
            ) : (
              <button
                onClick={handleChangePlan}
                disabled={loadingTier !== null}
                className={`w-full rounded-full py-3 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isUpgrade
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
                    : 'bg-foreground/10 text-foreground hover:bg-foreground/20'
                }`}
              >
                {loadingTier === 'portal' ? 'Redirecting...' : isUpgrade ? 'Upgrade' : 'Downgrade'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
