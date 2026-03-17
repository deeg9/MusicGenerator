'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, Sparkles } from 'lucide-react';
import Link from 'next/link';

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

const TIER_RANK: Record<string, number> = { starter: 1, pro: 2, unlimited: 3 };

function getButtonLabel(planTier: string, currentTier: string | null): string {
  if (!currentTier) return 'Subscribe';
  const planRank = TIER_RANK[planTier] ?? 0;
  const currentRank = TIER_RANK[currentTier] ?? 0;
  if (planRank === currentRank) return 'Current Plan';
  return planRank > currentRank ? 'Upgrade' : 'Downgrade';
}

function PricingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/subscription/check')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.tier) setCurrentTier(data.tier); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      const returnTo = searchParams.get('returnTo');
      const destination = returnTo && returnTo.startsWith('/') ? returnTo : '/quiz';
      setToast({ type: 'success', message: 'Subscription activated! Redirecting...' });
      const timer = setTimeout(() => router.push(destination), 2000);
      return () => clearTimeout(timer);
    }
    if (searchParams.get('canceled') === 'true') {
      setToast({ type: 'info', message: 'Checkout canceled. Choose a plan when you\'re ready.' });
    }
  }, [searchParams, router]);

  async function handleSubscribe(tier: string) {
    setLoadingTier(tier);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (res.status === 401) {
        router.push(`/login?next=/pricing`);
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setToast({ type: 'info', message: data.error ?? 'Something went wrong' });
      }
    } catch {
      setToast({ type: 'info', message: 'Something went wrong. Please try again.' });
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="max-w-5xl mx-auto">
        {/* Toast notification */}
        {toast && (
          <div
            className={`mb-8 mx-auto max-w-lg rounded-xl px-6 py-4 text-center text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Create personalized AI songs for the people you love. Subscribe to start generating.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                currentTier === plan.tier
                  ? 'border-primary bg-primary/[0.03] shadow-lg ring-2 ring-primary/20'
                  : plan.popular && !currentTier
                    ? 'border-primary bg-primary/[0.03] shadow-lg ring-2 ring-primary/20'
                    : 'border-border/60 bg-white shadow-sm'
              }`}
            >
              {currentTier === plan.tier ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold">
                  Current Plan
                </div>
              ) : plan.popular && !currentTier ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Most Popular
                </div>
              ) : null}

              <div className="mb-6">
                <h2 className="font-display text-xl text-foreground mb-1">{plan.name}</h2>
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

              {(() => {
                const label = getButtonLabel(plan.tier, currentTier);
                const isCurrent = label === 'Current Plan';
                return (
                  <button
                    onClick={() => !isCurrent && handleSubscribe(plan.tier)}
                    disabled={isCurrent || loadingTier !== null}
                    className={`w-full rounded-full py-3 text-sm font-bold transition-all disabled:cursor-not-allowed ${
                      isCurrent
                        ? 'bg-muted text-muted-foreground border border-border/60'
                        : plan.popular
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md disabled:opacity-50'
                          : 'bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50'
                    }`}
                  >
                    {loadingTier === plan.tier ? 'Redirecting...' : label}
                  </button>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Cancel anytime. All plans include a 30-day money-back guarantee.
        </p>

        <div className="text-center mt-4">
          <Link href="/quiz" className="text-sm text-primary hover:underline">
            Back to song creator
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}
