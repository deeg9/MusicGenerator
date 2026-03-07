'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Music, Link2 } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ConfettiBlast } from './_components/ConfettiBlast';
import { SongPlayer } from './_components/SongPlayer';
import { SharePrompt } from './_components/SharePrompt';

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
  searchParams: Promise<{ name?: string }>;
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
  const { name: recipientName = '' } = use(searchParams);

  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [pollKey, setPollKey] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);

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
              setAudioUrl(`/api/audio/${jobId}`);
              setPageState('ready');
            }
            return;
          }

          if (data.status === 'FAILED') {
            if (!cancelled) setPageState('error');
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

  // Check Again — re-polls same jobId from the start
  function handleCheckAgain() {
    setPageState('loading');
    setStageIndex(0);
    setPollKey((k) => k + 1);
  }

  // Create Another Song handler
  function handleCreateAnother() {
    try {
      localStorage.removeItem('notevra_quiz_v1');
    } catch {}
    router.push('/quiz');
  }

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
              Our music AI had a hiccup. Your quiz answers are safe — just try again and it'll
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
              onClick={handleCheckAgain}
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
              We're experiencing technical difficulties. Please try again later — your quiz answers
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

          {/* Player */}
          {audioUrl && <SongPlayer src={audioUrl} />}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {/* Download */}
            {audioUrl && (
              <a
                href={audioUrl}
                download={buildGiftFilename(recipientName)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                Download Song
              </a>
            )}

            {/* Create Another */}
            <button
              onClick={handleCreateAnother}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3 rounded-xl font-medium hover:bg-muted transition-colors"
            >
              Create Another Song
            </button>
          </div>

          {/* Share prompt */}
          <SharePrompt />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
