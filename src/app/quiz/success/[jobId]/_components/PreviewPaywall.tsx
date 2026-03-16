'use client';

import { Lock, Loader2 } from 'lucide-react';

interface PreviewBannerProps {
  isPreview: boolean;
}

interface PreviewCTAProps {
  isPreview: boolean;
  previewEnded: boolean;
  onUnlockClick: () => void;
  loading: boolean;
}

/**
 * Top banner — renders when isPreview is true, even before preview ends.
 * Tells the user they're listening to a 30-second preview.
 */
export function PreviewBanner({ isPreview }: PreviewBannerProps) {
  if (!isPreview) return null;

  return (
    <div className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground flex items-center justify-center gap-2">
      <span>You&apos;re listening to a 30-second preview.</span>
      <a
        href="/pricing"
        className="text-primary font-medium hover:underline"
      >
        See plans
      </a>
    </div>
  );
}

/**
 * CTA area — renders below the player.
 * Shows "Unlock Full Song" button when preview has ended,
 * or a subtle nudge while preview is still active.
 */
export function PreviewCTA({ isPreview, previewEnded, onUnlockClick, loading }: PreviewCTAProps) {
  if (!isPreview) return null;

  if (previewEnded) {
    return (
      <div className="flex justify-center">
        <button
          onClick={onUnlockClick}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl text-base font-bold shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Lock className="w-5 h-5" />
          )}
          {loading ? 'Checking...' : 'Unlock Full Song'}
        </button>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground text-center">
      Preview ends at 0:30 —{' '}
      <button
        onClick={onUnlockClick}
        disabled={loading}
        className="text-primary font-medium hover:underline disabled:opacity-50"
      >
        {loading ? 'checking...' : 'unlock full song'}
      </button>
    </p>
  );
}
