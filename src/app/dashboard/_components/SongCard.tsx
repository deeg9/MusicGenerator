'use client';

import { useState } from 'react';
import { Download, Lock, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SongPlayer } from '@/app/quiz/success/[jobId]/_components/SongPlayer';
import { UnlockModal, type CreditState } from '@/components/UnlockModal';

interface SongCardProps {
  songId: string;
  recipientName: string;
  relationship: string;
  genre: string;
  status: 'generating' | 'completed' | 'failed';
  createdAt: string;       // ISO string — serialized from server component
  audioUrl: string | null;
  downloadUrl: string | null;
  downloadFilename: string;
  hasSubscription?: boolean;
  isUnlocked?: boolean;
  isUnlimitedTier?: boolean;
}

export function SongCard({
  songId,
  recipientName,
  relationship,
  genre,
  status,
  createdAt,
  audioUrl,
  downloadUrl,
  downloadFilename,
  hasSubscription = false,
  isUnlocked = false,
  isUnlimitedTier = false,
}: SongCardProps) {
  const router = useRouter();
  const [localUnlocked, setLocalUnlocked] = useState(false);
  const showFull = !!(isUnlocked || isUnlimitedTier || localUnlocked);
  const formattedDate = new Date(createdAt).toLocaleDateString();

  // Unlock modal state
  const [showModal, setShowModal] = useState(false);
  const [creditState, setCreditState] = useState<CreditState | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);

  async function handleUnlockClick() {
    setLoadingCheck(true);
    try {
      const res = await fetch('/api/subscription/check');
      if (res.status === 401) {
        // Not logged in — shouldn't happen on dashboard, but handle gracefully
        router.push('/login');
        return;
      }
      if (res.status === 404 || !res.ok) {
        setCreditState({ type: 'no-subscription' });
        setShowModal(true);
        return;
      }
      const data = await res.json();
      if (!data.active) {
        setCreditState({ type: 'no-subscription' });
      } else if (data.songsRemaining > 0) {
        setCreditState({
          type: 'has-credits',
          songsRemaining: data.songsRemaining,
          songsPerMonth: data.songsPerMonth,
          tier: data.tier,
        });
      } else {
        setCreditState({
          type: 'no-credits',
          songsPerMonth: data.songsPerMonth,
          tier: data.tier,
          currentPeriodEnd: data.currentPeriodEnd,
        });
      }
      setShowModal(true);
    } catch {
      setCreditState({ type: 'no-subscription' });
      setShowModal(true);
    } finally {
      setLoadingCheck(false);
    }
  }

  async function handleConfirmUnlock() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/songs/${songId}/unlock`, { method: 'POST' });
      const data = await res.json();
      if (data.unlocked) {
        setShowModal(false);
        setLocalUnlocked(true);
        router.refresh(); // Refresh server data for download URL
      } else if (data.error === 'insufficient_credits') {
        setCreditState({
          type: 'no-credits',
          songsPerMonth: data.songsPerMonth,
          tier: data.tier,
          currentPeriodEnd: data.currentPeriodEnd,
        });
      }
    } catch {
      // Network error — close modal
      setShowModal(false);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl text-foreground">
            A song for {recipientName}
          </h2>
          {status === 'completed' && !showFull && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              30s Preview
            </span>
          )}
          {status === 'generating' && (
            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating
            </span>
          )}
          {status === 'failed' && (
            <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Failed
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground capitalize">
          {relationship} · {genre} · {formattedDate}
        </p>
      </div>

      {status === 'completed' && audioUrl && (
        <SongPlayer src={audioUrl} isPreview={!showFull} />
      )}

      {status === 'generating' && (
        <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Your song is being created. This usually takes a few seconds.</span>
        </div>
      )}

      {status === 'failed' && (
        <div className="flex items-center gap-3 py-4 text-sm text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Something went wrong generating this song.</span>
        </div>
      )}

      {status === 'completed' && (
        showFull ? (
          <a
            href={downloadUrl ?? '#'}
            download={downloadFilename}
            className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        ) : (
          <button
            onClick={handleUnlockClick}
            disabled={loadingCheck}
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loadingCheck ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            Use Credit to Unlock Full Song
          </button>
        )
      )}

      {status === 'failed' && (
        <Link
          href="/quiz"
          className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
        >
          Try Again
        </Link>
      )}

      {creditState && (
        <UnlockModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmUnlock}
          confirming={confirming}
          creditState={creditState}
        />
      )}
    </div>
  );
}
