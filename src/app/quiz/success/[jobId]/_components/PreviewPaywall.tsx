'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';

interface PreviewPaywallProps {
  isPreview: boolean;
  previewEnded: boolean;
}

/**
 * Top banner — renders when isPreview is true, even before preview ends.
 * Tells the user they're listening to a 30-second preview.
 */
export function PreviewBanner({ isPreview }: Pick<PreviewPaywallProps, 'isPreview'>) {
  if (!isPreview) return null;

  return (
    <div className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground flex items-center justify-center gap-2">
      <span>You&apos;re listening to a 30-second preview.</span>
      <Link href="/pricing" className="text-primary font-medium hover:underline">
        See plans
      </Link>
    </div>
  );
}

/**
 * CTA area — renders below the player.
 * Shows "Unlock Full Song" button when preview has ended,
 * or a subtle nudge while preview is still active.
 */
export function PreviewCTA({ isPreview, previewEnded }: PreviewPaywallProps) {
  if (!isPreview) return null;

  if (previewEnded) {
    return (
      <div className="flex justify-center">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl text-base font-bold shadow-md hover:opacity-90 transition-opacity"
        >
          <Lock className="w-5 h-5" />
          Unlock Full Song
        </Link>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground text-center">
      Preview ends at 0:30 —{' '}
      <Link href="/pricing" className="text-primary font-medium hover:underline">
        subscribe
      </Link>{' '}
      for the full song
    </p>
  );
}
