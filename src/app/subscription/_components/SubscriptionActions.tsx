'use client';

import { useState } from 'react';
import { CreditCard, Receipt, XCircle } from 'lucide-react';

export function SubscriptionActions({ hasSubscription }: { hasSubscription: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);

  if (!hasSubscription) return null;

  async function openPortal() {
    setLoading('portal');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } finally {
      setLoading(null);
    }
  }

  const actions = [
    { id: 'payment', label: 'Update Payment Method', icon: CreditCard },
    { id: 'billing', label: 'Billing History', icon: Receipt },
    { id: 'cancel', label: 'Cancel Subscription', icon: XCircle },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-white p-6 md:p-8">
      <h2 className="font-display text-lg text-foreground mb-4">Account</h2>
      <div className="flex flex-col sm:flex-row gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={openPortal}
            disabled={loading !== null}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              action.id === 'cancel'
                ? 'text-red-600 hover:bg-red-50 border border-red-200'
                : 'text-foreground hover:bg-muted border border-border/60'
            }`}
          >
            <action.icon className="w-4 h-4" />
            {loading === 'portal' ? 'Redirecting...' : action.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        You'll be redirected to our secure billing portal to make changes.
      </p>
    </div>
  );
}
