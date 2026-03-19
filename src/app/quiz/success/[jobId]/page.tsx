'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Music, Link2 } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { createClient } from '@/lib/supabase/client';
import { ConfettiBlast } from './_components/ConfettiBlast';
import { SongPlayer } from './_components/SongPlayer';
import { SharePrompt } from './_components/SharePrompt';
import { AuthPrompt } from './_components/AuthPrompt';
import { RecipientEmailForm } from './_components/RecipientEmailForm';
import { PreviewBanner, PreviewCTA } from './_components/PreviewPaywall';
import { SubscribeToDownload } from './_components/SubscribeToDownload';
import { UnlockModal, type CreditState } from '@/components/UnlockModal';
import {
  trackSongGenerationStarted,
  trackSongGenerationCompleted,
  trackSongGenerationFailed,
  trackSongDownloaded,
} from '@/lib/analytics';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 900_000; // 15 minutes
const STAGE_INTERVAL_MS = 45_000; // rotate stage messages every 45s

const STAGE_MESSAGES = [
  'Composing your melody...',
  'Writing the lyrics...',
  'Arranging the instruments...',
  'Mixing the harmonies...',
  'Adding vocal textures...',
  'Polishing the final mix...',
  'Putting the finishing touches on your song...',
  'Almost there — just a little longer...',
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'ready' | 'error' | 'timeout' | 'pod-down';

interface PollResponse {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error: string | null;
  unlockedAt: string | null;
  recipientEmailSentAt: string | null;
  recipientEmail: string | null;
}

interface PodDownResponse {
  error: {
    category: string;
    retryable: boolean;
    userMessage: string;
  };
  debug?: {
    technicalMessage: string;
  };
}

interface SuccessPageProps {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ name?: string; songId?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildGiftFilename(name: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 30) || 'someone-special';
  return `notevra-song-for-${slug}.mp3`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SuccessPage({ params, searchParams }: SuccessPageProps) {
  const { jobId } = use(params);
  const { name: recipientName = '', songId = '' } = use(searchParams);

  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [pollKey, setPollKey] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);

  // Analytics: track generation lifecycle
  const pageMountTimeRef = useRef(Date.now());
  const generationTrackedRef = useRef(false);

  // Track generation started on mount
  useEffect(() => {
    if (jobId && songId) {
      trackSongGenerationStarted(jobId, songId);
    }
  }, [jobId, songId]);

  // Recipient email state from poll response
  const [recipientEmailSentAt, setRecipientEmailSentAt] = useState<string | null>(null);
  const [recipientEmailFromQuiz, setRecipientEmailFromQuiz] = useState<string | null>(null);

  // Preview paywall — default to true (restrict first, unlock after check)
  const [isPreview, setIsPreview] = useState(true);
  const [previewEnded, setPreviewEnded] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [creditState, setCreditState] = useState<CreditState | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Rotate stage messages every 45s
  useEffect(() => {
    if (pageState !== 'loading') return;

    const interval = setInterval(() => {
      setStageIndex((prev) =>
        prev < STAGE_MESSAGES.length - 1 ? prev + 1 : prev,
      );
    }, STAGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pageState, pollKey]);

  // Polling state machine
  useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    // Reset stage when poll restarts
    setStageIndex(0);

    async function poll() {
      while (true) {
        // Timeout check
        if (Date.now() - start > POLL_TIMEOUT_MS) {
          if (!cancelled) setPageState('timeout');
          return;
        }

        try {
          const res = await fetch(`/api/poll-job/${jobId}`);

          if (!res.ok) {
            // Check if this is a pod-down error (502 with gpu_unavailable category)
            if (res.status === 502) {
              try {
                const body = (await res.json()) as PodDownResponse;
                if (body.error?.category === 'gpu_unavailable') {
                  if (!cancelled) setPageState('pod-down');
                  return;
                }
              } catch {
                // JSON parse failed — treat as transient
              }
            }
            // Transient server error — keep polling
            await sleep(POLL_INTERVAL_MS);
            continue;
          }

          const data = (await res.json()) as PollResponse;

          if (data.status === 'COMPLETED') {
            if (!cancelled) {
              // Track generation completed
              if (!generationTrackedRef.current) {
                generationTrackedRef.current = true;
                trackSongGenerationCompleted(
                  songId,
                  Date.now() - pageMountTimeRef.current,
                );
                window.fbq?.('track', 'CompleteRegistration');
              }

              try {
                const audioRes = await fetch(`/api/audio/${jobId}`);
                const { url } = await audioRes.json();
                setAudioUrl(url);
              } catch {
                setAudioUrl(`/api/audio/${jobId}`);
              }

              // Thread recipient email info from poll response
              if (data.recipientEmailSentAt) {
                setRecipientEmailSentAt(data.recipientEmailSentAt);
              }
              if (data.recipientEmail) {
                setRecipientEmailFromQuiz(data.recipientEmail);
              }

              // If song is already unlocked (e.g. from a previous session), skip preview
              if (data.unlockedAt) {
                setIsPreview(false);
              }

              setPageState('ready');
            }
            return;
          }

          if (data.status === 'FAILED') {
            if (!cancelled) {
              trackSongGenerationFailed(data.error ?? 'unknown');
              setPageState('error');
            }
            return;
          }

          // QUEUED or PROCESSING — keep polling
        } catch {
          // Transient network error — continue polling
        }

        await sleep(POLL_INTERVAL_MS);
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [jobId, pollKey]);

  // Subscription check + auto-unlock for unlimited tier
  useEffect(() => {
    async function checkAndAutoUnlock() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Anonymous users remain in preview mode
      if (!user) return;

      try {
        const res = await fetch('/api/subscription/check');
        if (!res.ok) return;

        const data = await res.json();

        // Unlimited tier: auto-unlock without modal
        if (data.active && data.songsPerMonth === -1 && songId) {
          try {
            const unlockRes = await fetch(`/api/songs/${songId}/unlock`, { method: 'POST' });
            if (unlockRes.ok) {
              setIsPreview(false);
              return;
            }
          } catch {
            // Fall through to normal check
          }
        }

        // Already unlocked is handled by poll response (unlockedAt check above)
        // For non-unlimited active subscribers, stay in preview until they click unlock
      } catch {
        // Network error — keep preview mode as safe default
      }
    }

    void checkAndAutoUnlock();
  }, [songId]);

  // Handle unlock button click — fetch credit state and show modal
  const handleUnlockClick = useCallback(async () => {
    setModalLoading(true);

    // Check if user is authenticated
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to login
      const returnTo = window.location.pathname + window.location.search;
      router.push(`/signup?next=${encodeURIComponent(returnTo)}`);
      setModalLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/subscription/check');
      const data = await res.json();

      if (!res.ok || !data.active) {
        // No subscription
        setCreditState({ type: 'no-subscription' });
        setModalOpen(true);
        setModalLoading(false);
        return;
      }

      // Unlimited tier — auto-unlock, no modal
      if (data.songsPerMonth === -1) {
        setUnlockLoading(true);
        try {
          const unlockRes = await fetch(`/api/songs/${songId}/unlock`, { method: 'POST' });
          if (unlockRes.ok) {
            setIsPreview(false);
          }
        } catch { /* no-op */ }
        setUnlockLoading(false);
        setModalLoading(false);
        return;
      }

      if (data.songsRemaining > 0) {
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

      setModalOpen(true);
    } catch {
      // Network error
    }

    setModalLoading(false);
  }, [songId, router]);

  // Handle modal confirm (spend credit)
  const handleModalConfirm = useCallback(async () => {
    setUnlockLoading(true);
    try {
      const res = await fetch(`/api/songs/${songId}/unlock`, { method: 'POST' });
      const data = await res.json();

      if (data.unlocked) {
        setIsPreview(false);
        setModalOpen(false);
      } else if (data.error === 'insufficient_credits') {
        // Credits ran out between check and confirm — show no-credits state
        setCreditState({
          type: 'no-credits',
          songsPerMonth: data.songsPerMonth,
          tier: data.tier,
          currentPeriodEnd: data.currentPeriodEnd,
        });
      }
    } catch {
      // Network error
    }
    setUnlockLoading(false);
  }, [songId]);

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <motion.div
            animate={reducedMotion ? {} : { scale: [1, 1.15, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Music className="w-8 h-8 text-primary" />
          </motion.div>

          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl text-foreground">
              {recipientName
                ? `Creating your song for ${recipientName}…`
                : 'Creating your song…'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {STAGE_MESSAGES[stageIndex]}
            </p>
          </div>

          {/* Animated dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                animate={reducedMotion ? {} : { opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            This usually takes around 10 minutes
          </p>

          <button
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href);
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 2000);
            }}
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            {linkCopied ? 'Link copied!' : 'Copy link to check back later'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Error state (retryable — song failed) ─────────────────────────────────
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-yellow-600" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl text-foreground">
              Something went wrong creating your song
            </h1>
            <p className="text-muted-foreground text-sm">
              Our music AI had a hiccup. Your quiz answers are safe — just try again and it&apos;ll
              usually work right away.
            </p>
          </div>
          <button
            onClick={() => router.push('/quiz')}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── Timeout state ─────────────────────────────────────────────────────────
  if (pageState === 'timeout') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-yellow-600" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl text-foreground">
              This is taking longer than expected
            </h1>
            <p className="text-muted-foreground text-sm">
              Our music AI might be warming up. Please try again in a moment — it should be much
              faster on the next attempt.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setPageState('loading');
                setStageIndex(0);
                setPollKey((k) => k + 1);
              }}
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              Check Again
            </button>
            <button
              onClick={() => router.push('/quiz')}
              className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3 rounded-xl font-medium hover:bg-muted transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Pod-down state (non-retryable — servers offline) ──────────────────────
  if (pageState === 'pod-down') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-yellow-600" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl text-foreground">
              Our servers are temporarily offline
            </h1>
            <p className="text-muted-foreground text-sm">
              We&apos;re experiencing technical difficulties. Please try again later — your quiz answers
              are saved.
            </p>
          </div>
          <button
            onClick={() => router.push('/quiz')}
            className="inline-flex items-center gap-2 border border-border text-foreground px-6 py-3 rounded-xl font-medium hover:bg-muted transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // ─── Ready state ───────────────────────────────────────────────────────────
  // pageState === 'ready'
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      {/* Confetti fires once on mount when ready */}
      <ConfettiBlast />

      <AnimatePresence>
        <motion.div
          key="ready"
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-8 w-full max-w-lg"
        >
          {/* Header */}
          <div className="text-center flex flex-col gap-2">
            <h1 className="font-display text-3xl md:text-4xl text-foreground">
              Your song is ready!
            </h1>
            {recipientName && (
              <p className="text-muted-foreground text-lg">A song for {recipientName}</p>
            )}
          </div>

          {/* Preview banner — visible to preview users above the player */}
          <PreviewBanner isPreview={isPreview} />

          {/* Player */}
          {audioUrl && (
            <SongPlayer
              src={audioUrl}
              isPreview={isPreview}
              onPreviewEnd={() => setPreviewEnded(true)}
              songId={songId}
              source="success_page"
              recipientName={recipientName || undefined}
            />
          )}

          {/* Preview CTA — shows nudge or "Unlock Full Song" button below player */}
          <PreviewCTA
            isPreview={isPreview}
            previewEnded={previewEnded}
            onUnlockClick={handleUnlockClick}
            loading={modalLoading}
          />

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {/* Download — gated for preview users */}
            {audioUrl && (
              isPreview ? (
                <SubscribeToDownload
                  onUnlockClick={handleUnlockClick}
                  loading={modalLoading}
                />
              ) : (
                <a
                  href={`/api/audio/${jobId}?download=true&name=${encodeURIComponent(buildGiftFilename(recipientName))}`}
                  onClick={() => trackSongDownloaded(songId)}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  <Download className="w-4 h-4" />
                  Download Song
                </a>
              )
            )}

            {/* Create Another */}
            <button
              onClick={() => {
                try { localStorage.removeItem('notevra_quiz_v1'); } catch {}
                router.push('/quiz');
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3 rounded-xl font-medium hover:bg-muted transition-colors"
            >
              Create Another Song
            </button>
          </div>

          {/* Share prompt */}
          <SharePrompt songId={songId} />

          {/* Auth upsell — only renders for anonymous users */}
          <AuthPrompt jobId={jobId} />

          {/* Gift email form — only show if songId is available */}
          {songId && <RecipientEmailForm songId={songId} recipientEmailSentAt={recipientEmailSentAt} recipientEmail={recipientEmailFromQuiz} />}
        </motion.div>
      </AnimatePresence>

      {/* Unlock modal */}
      {creditState && (
        <UnlockModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleModalConfirm}
          confirming={unlockLoading}
          creditState={creditState}
        />
      )}
    </div>
  );
}
