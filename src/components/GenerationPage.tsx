'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GenerationForm, type GenerationFormData } from './GenerationForm';
import { GenerationResults } from './GenerationResults';
import { LoadingAnimation, STAGE_DURATIONS } from './LoadingAnimation';
import { useGenerationStatus } from '@/hooks/useGenerationStatus';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type GenerationPhase = 'idle' | 'submitting' | 'polling' | 'done' | 'error';

const phaseVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export function GenerationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  const initialJobId = searchParams.get('job');
  const [jobId, setJobId] = useState<string | null>(initialJobId);
  const [enhancedCaption, setEnhancedCaption] = useState<string | null>(null);
  const [phase, setPhase] = useState<GenerationPhase>(initialJobId ? 'polling' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetryable, setIsRetryable] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);

  const lastFormData = useRef<GenerationFormData | null>(null);

  const transitionDuration = reducedMotion ? 0 : 0.2;

  // Poll status when we have a jobId
  const { data, elapsedSeconds, error: hookError } = useGenerationStatus(
    phase === 'polling' || phase === 'done' ? jobId : null
  );

  // Watch hook results to advance phase
  useEffect(() => {
    if (data?.status === 'completed' && phase === 'polling') {
      setPhase('done');
    } else if (data?.status === 'failed' && phase === 'polling') {
      setPhase('error');
      setErrorMessage(data.error?.message ?? 'Generation failed. Please try again.');
      setIsRetryable(data.error?.retryable ?? true);
    }
  }, [data, phase]);

  useEffect(() => {
    if (hookError && phase === 'polling') {
      setPhase('error');
      setErrorMessage(hookError);
      setIsRetryable(true);
    }
  }, [hookError, phase]);

  // Stage progression timer during polling
  useEffect(() => {
    if (phase !== 'polling') return;

    setStageIndex(0);

    const timer1 = setTimeout(() => setStageIndex(1), STAGE_DURATIONS[0]);
    const timer2 = setTimeout(() => setStageIndex(2), STAGE_DURATIONS[0] + STAGE_DURATIONS[1]);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [phase]);

  async function handleSubmit(data: GenerationFormData) {
    lastFormData.current = data;
    setPhase('submitting');
    setErrorMessage(null);
    setJobId(null);
    setEnhancedCaption(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        const message = errorBody?.error?.message ?? 'Failed to start generation.';
        setPhase('error');
        setErrorMessage(message);
        setIsRetryable(false);
        return;
      }

      const result = await res.json();
      const newJobId: string = result.jobId;
      setJobId(newJobId);
      setEnhancedCaption(result.enhancedCaption ?? null);

      const params = new URLSearchParams(searchParams.toString());
      params.set('job', newJobId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      setPhase('polling');
    } catch {
      setPhase('error');
      setErrorMessage('Network error. Please check your connection and try again.');
      setIsRetryable(true);
    }
  }

  function handleRetry() {
    if (lastFormData.current) {
      handleSubmit(lastFormData.current);
    }
  }

  function handleBackToForm() {
    setPhase('idle');
    setErrorMessage(null);
  }

  function handleNewGeneration() {
    setPhase('idle');
    setJobId(null);
    setEnhancedCaption(null);
    setErrorMessage(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('job');
    router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
  }

  // Listen for navigate-create events from sidebar/hero
  useEffect(() => {
    function onNavigateCreate() {
      if (phase !== 'idle') {
        handleNewGeneration();
      }
    }
    window.addEventListener('navigate-create', onNavigateCreate);
    return () => window.removeEventListener('navigate-create', onNavigateCreate);
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <AnimatePresence mode="wait">
        {/* Form — shown when idle */}
        {phase === 'idle' && (
          <motion.div
            key="form"
            variants={phaseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: transitionDuration }}
          >
            <GenerationForm onSubmit={handleSubmit} isSubmitting={false} />
          </motion.div>
        )}

        {/* Loading — shown when submitting or polling */}
        {(phase === 'submitting' || phase === 'polling') && (
          <motion.div
            key="loading"
            variants={phaseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: transitionDuration }}
          >
            <LoadingAnimation
              stageIndex={phase === 'submitting' ? 0 : stageIndex}
              elapsedSeconds={elapsedSeconds}
              showElapsed={phase === 'polling'}
            />
          </motion.div>
        )}

        {/* Error banner */}
        {phase === 'error' && (
          <motion.div
            key="error"
            variants={phaseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: transitionDuration }}
          >
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
              <p className="text-sm text-destructive">
                {errorMessage ?? 'Something went wrong. Please try again.'}
              </p>
              <div className="mt-3 flex gap-3">
                {isRetryable ? (
                  <button
                    onClick={handleRetry}
                    className="text-sm font-medium text-destructive underline underline-offset-2 hover:opacity-80"
                  >
                    Try again
                  </button>
                ) : null}
                <button
                  onClick={handleBackToForm}
                  className="text-sm font-medium text-muted-foreground underline underline-offset-2 hover:opacity-80"
                >
                  Change settings
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results — shown when done */}
        {phase === 'done' && (
          <motion.div
            key="results"
            variants={phaseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: transitionDuration }}
            className="mt-8"
          >
            <button
              onClick={handleNewGeneration}
              className="mb-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Create New Song
            </button>
            <GenerationResults jobId={jobId} enhancedCaption={enhancedCaption} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
