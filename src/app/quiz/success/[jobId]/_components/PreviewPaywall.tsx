'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';

interface PreviewBannerProps {
  isPreview: boolean;
}

interface PreviewCTAProps {
  isPreview: boolean;
  previewEnded: boolean;
}

function useCheckout() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const returnTo = `${pathname}?${searchParams.toString()}`;

  async function startCheckout() {
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
      // Network error — no-op, button resets
    } finally {
      setLoading(false);
    }
  }

  return { startCheckout, loading };
}

/**
 * Top banner — renders when isPreview is true, even before preview ends.
 * Tells the user they're listening to a 30-second preview.
 */
export function PreviewBanner({ isPreview }: PreviewBannerProps) {
  const { startCheckout, loading } = useCheckout();

  if (!isPreview) return null;

  return (
    <div className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground flex items-center justify-center gap-2">
      <span>You&apos;re listening to a 30-second preview.</span>
      <button
        onClick={startCheckout}
        disabled={loading}
        className="text-primary font-medium hover:underline disabled:opacity-50"
      >
        {loading ? 'Redirecting...' : 'See plans'}
      </button>
    </div>
  );
}

/**
 * CTA area — renders below the player.
 * Shows "Unlock Full Song" button when preview has ended,
 * or a subtle nudge while preview is still active.
 */
export function PreviewCTA({ isPreview, previewEnded }: PreviewCTAProps) {
  const { startCheckout, loading } = useCheckout();

  if (!isPreview) return null;

  if (previewEnded) {
    return (
      <div className="flex justify-center">
        <button
          onClick={startCheckout}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl text-base font-bold shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Lock className="w-5 h-5" />
          )}
          {loading ? 'Redirecting...' : 'Unlock Full Song'}
        </button>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground text-center">
      Preview ends at 0:30 —{' '}
      <button
        onClick={startCheckout}
        disabled={loading}
        className="text-primary font-medium hover:underline disabled:opacity-50"
      >
        {loading ? 'redirecting...' : 'subscribe'}
      </button>{' '}
      for the full song
    </p>
  );
}
