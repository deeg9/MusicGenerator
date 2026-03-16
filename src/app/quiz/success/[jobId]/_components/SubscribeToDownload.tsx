'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';

export function SubscribeToDownload() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const returnTo = `${pathname}?${searchParams.toString()}`;

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'starter', returnTo }),
      });

      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(returnTo)}`);
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Network error — no-op
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Lock className="w-4 h-4" />
      )}
      {loading ? 'Redirecting...' : 'Subscribe to Download'}
    </button>
  );
}
