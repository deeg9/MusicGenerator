'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export type CreditState =
  | { type: 'has-credits'; songsRemaining: number; songsPerMonth: number; tier: string }
  | { type: 'no-credits'; songsPerMonth: number; tier: string; currentPeriodEnd: string | null }
  | { type: 'no-subscription' };

interface UnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirming: boolean;
  creditState: CreditState;
}

export function UnlockModal({ isOpen, onClose, onConfirm, confirming, creditState }: UnlockModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-background rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {creditState.type === 'has-credits' && (
          <HasCreditsContent
            creditState={creditState}
            onClose={onClose}
            onConfirm={onConfirm}
            confirming={confirming}
          />
        )}

        {creditState.type === 'no-credits' && (
          <NoCreditsContent creditState={creditState} onClose={onClose} />
        )}

        {creditState.type === 'no-subscription' && (
          <NoSubscriptionContent onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function HasCreditsContent({
  creditState,
  onClose,
  onConfirm,
  confirming,
}: {
  creditState: Extract<CreditState, { type: 'has-credits' }>;
  onClose: () => void;
  onConfirm: () => void;
  confirming: boolean;
}) {
  const { songsRemaining, songsPerMonth } = creditState;
  const progressPct = Math.round((songsRemaining / songsPerMonth) * 100);

  return (
    <div className="flex flex-col items-center text-center gap-4">
      <h2 className="font-display text-xl text-foreground">Unlock Full Song?</h2>
      <p className="text-sm text-muted-foreground">
        Use 1 credit to unlock this song for unlimited listening and download.
      </p>

      <div className="w-full flex flex-col gap-1.5">
        <p className="text-sm text-muted-foreground">
          Credits remaining: <span className="font-medium text-foreground">{songsRemaining}</span> of {songsPerMonth}
        </p>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="w-full pt-2">
        <button
          onClick={onConfirm}
          disabled={confirming}
          className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {confirming ? 'Unlocking...' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}

function NoCreditsContent({
  creditState,
  onClose,
}: {
  creditState: Extract<CreditState, { type: 'no-credits' }>;
  onClose: () => void;
}) {
  const renewalDate = creditState.currentPeriodEnd
    ? new Date(creditState.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="flex flex-col items-center text-center gap-4">
      <h2 className="font-display text-xl text-foreground">No Credits Remaining</h2>
      <p className="text-sm text-muted-foreground">
        You&apos;ve used all your song credits this month.
        {renewalDate && (
          <> Upgrade your plan for more songs, or wait for your next renewal on {renewalDate}.</>
        )}
        {!renewalDate && <> Upgrade your plan for more songs.</>}
      </p>

      <div className="flex gap-3 w-full pt-2">
        <button
          onClick={onClose}
          className="flex-1 border border-border text-foreground px-4 py-2.5 rounded-xl font-medium hover:bg-muted transition-colors"
        >
          Close
        </button>
        <a
          href="/pricing"
          className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity text-center"
        >
          Upgrade Plan
        </a>
      </div>
    </div>
  );
}

function NoSubscriptionContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <h2 className="font-display text-xl text-foreground">Subscribe to Unlock</h2>
      <p className="text-sm text-muted-foreground">
        Get song credits with a subscription starting at $3.99/month.
      </p>

      <div className="flex gap-3 w-full pt-2">
        <button
          onClick={onClose}
          className="flex-1 border border-border text-foreground px-4 py-2.5 rounded-xl font-medium hover:bg-muted transition-colors"
        >
          Close
        </button>
        <a
          href="/pricing"
          className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity text-center"
        >
          See Plans
        </a>
      </div>
    </div>
  );
}
