'use client';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import type { ZodTypeAny } from 'zod';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { QuizProgress } from './_components/QuizProgress';
import { QuizCard } from './_components/QuizCard';
import { GeneratingOverlay } from './_components/GeneratingOverlay';
import { Step1Relationship, step1Schema } from './_components/Step1Relationship';
import { Step2GenreVoice, step2Schema } from './_components/Step2GenreVoice';
import { Step3Qualities, step3Schema } from './_components/Step3Qualities';
import { Step4Memories, step4Schema } from './_components/Step4Memories';
import { Step5Message, step5Schema } from './_components/Step5Message';
import { Step6Language, step6Schema } from './_components/Step6Language';
import type { QuizData } from '@/lib/quiz-types';
import { INITIAL_QUIZ_DATA, HOMEPAGE_INPUT_KEY, type HomepageInput } from '@/lib/quiz-types';
import {
  trackQuizStarted,
  trackQuizStepCompleted,
  trackQuizStepBack,
  trackQuizCompleted,
} from '@/lib/analytics';

// ─── Constants ───────────────────────────────────────────────────────────────

const QUIZ_STORAGE_KEY = 'notevra_quiz_v1';
const TOTAL_STEPS = 6;
const STEP_NAMES = ['relationship', 'genre_voice', 'qualities', 'memories', 'message', 'language'];

// ─── Per-step Zod schemas (null = no validation yet) ─────────────────────────

const STEP_SCHEMAS: (ZodTypeAny | null)[] = [
  step1Schema,   // Step 0 — Relationship + Name
  step2Schema,   // Step 1 — Genre + Voice
  step3Schema,   // Step 2 — Qualities
  step4Schema,   // Step 3 — Memories
  step5Schema,   // Step 4 — Message
  step6Schema,   // Step 5 — Language + Email
];

// ─── Animation variants ───────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const reducedMotion = useReducedMotion();
  const router = useRouter();

  const [data, setData] = useState<QuizData>(INITIAL_QUIZ_DATA);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [genStatus, setGenStatus] = useState<'idle' | 'generating' | 'error'>('idle');
  const [genError, setGenError] = useState<string | null>(null);

  // Analytics timing refs
  const quizStartTimeRef = useRef(Date.now());
  const stepStartTimeRef = useRef(Date.now());

  // Restore quiz state from localStorage on mount (survives refresh)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(QUIZ_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { data?: Partial<QuizData>; step?: number };
        if (parsed.data) setData((prev) => ({ ...prev, ...parsed.data }));
        if (typeof parsed.step === 'number' && parsed.step >= 0 && parsed.step < TOTAL_STEPS) {
          setCurrentStep(parsed.step);
        }
      }
    } catch {
      // Ignore corrupt/missing storage
    }

    try {
      const homepageRaw = localStorage.getItem(HOMEPAGE_INPUT_KEY);
      if (homepageRaw) {
        const homepageInput = JSON.parse(homepageRaw) as HomepageInput;
        localStorage.removeItem(HOMEPAGE_INPUT_KEY); // consume once
        setData((prev) => ({
          ...prev,
          ...(homepageInput.genre && !prev.genre ? { genre: homepageInput.genre } : {}),
          ...(homepageInput.prompt && !prev.memories ? { memories: homepageInput.prompt } : {}),
        }));
      }
    } catch {
      // Ignore corrupt homepage input
    }
  }, []);

  // Track quiz_started on mount (fires once regardless of localStorage restore)
  useEffect(() => {
    trackQuizStarted();
    window.fbq?.('track', 'Lead');
  }, []);

  // Persist quiz state to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ data, step: currentStep }));
    } catch {
      // Ignore storage errors (quota exceeded, private browsing, etc.)
    }
  }, [data, currentStep]);

  // Scroll to top on step change (fixes mobile viewport starting mid-page)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  // ─── Generation ──────────────────────────────────────────────────────────────

  async function handleCreate() {
    setGenStatus('generating');
    try {
      // Check auth + subscription before generating
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/signup?next=/quiz');
        return;
      }

      const response = await fetch('/api/quiz-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const body = (await response.json()) as {
          error?: { userMessage?: string; code?: string } | string;
        };
        const errorObj = typeof body.error === 'object' ? body.error : null;
        if (errorObj?.code === 'subscription_required') {
          router.push('/pricing');
          return;
        }
        if (errorObj?.code === 'credits_exhausted') {
          setGenError('You\'ve used all your song credits this month. Upgrade your plan for more.');
          setGenStatus('error');
          return;
        }
        const message = errorObj?.userMessage ?? (typeof body.error === 'string' ? body.error : 'Generation failed');
        throw new Error(message);
      }
      const { jobId, songId } = (await response.json()) as { jobId: string; songId: string };
      // Only clear localStorage after successful response
      localStorage.removeItem(QUIZ_STORAGE_KEY);
      router.push(`/quiz/success/${jobId}?name=${encodeURIComponent(data.recipientName)}&songId=${songId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setGenError(message);
      setGenStatus('error');
    }
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  function goNext() {
    const schema = STEP_SCHEMAS[currentStep];
    if (schema) {
      const result = schema.safeParse(data);
      if (!result.success && result.error) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          const key = String(issue.path[0]);
          if (key && !fieldErrors[key]) {
            fieldErrors[key] = issue.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }
    setErrors({});

    // Track step completion with timing
    trackQuizStepCompleted(
      currentStep + 1,
      STEP_NAMES[currentStep],
      Date.now() - stepStartTimeRef.current,
    );
    stepStartTimeRef.current = Date.now();

    if (currentStep < TOTAL_STEPS - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    } else {
      // Final step — track quiz completion, then trigger generation
      trackQuizCompleted({
        totalTimeMs: Date.now() - quizStartTimeRef.current,
        occasion: data.relationshipType,
        genre: data.genre,
        voice: data.voicePreference,
        language: data.language,
      });
      window.fbq?.('track', 'InitiateCheckout');
      void handleCreate();
    }
  }

  function goBack() {
    if (currentStep > 0) {
      trackQuizStepBack(currentStep + 1, STEP_NAMES[currentStep]);
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }

  function updateData(fields: Partial<QuizData>) {
    setData((prev) => ({ ...prev, ...fields }));
    // Clear errors for any updated fields
    const updatedKeys = Object.keys(fields);
    if (updatedKeys.some((k) => errors[k])) {
      setErrors((prev) => {
        const next = { ...prev };
        updatedKeys.forEach((k) => delete next[k]);
        return next;
      });
    }
  }

  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const isGenerating = genStatus === 'generating';

  // ─── Render step content ──────────────────────────────────────────────────

  function renderStep() {
    switch (currentStep) {
      case 0:
        return (
          <QuizCard
            title="Who is this song for?"
            subtitle="Every great song starts with someone special."
          >
            <Step1Relationship data={data} errors={errors} updateData={updateData} />
          </QuizCard>
        );
      case 1:
        return (
          <QuizCard
            title="Set the mood"
            subtitle="Choose the perfect style for their song."
          >
            <Step2GenreVoice data={data} errors={errors} updateData={updateData} />
          </QuizCard>
        );
      case 2:
        return (
          <QuizCard
            title="What makes them special?"
            subtitle="The little things that make them who they are."
          >
            <Step3Qualities data={data} errors={errors} updateData={updateData} />
          </QuizCard>
        );
      case 3:
        return (
          <QuizCard
            title="Share a memory"
            subtitle="A moment you'll never forget together."
          >
            <Step4Memories data={data} errors={errors} updateData={updateData} />
          </QuizCard>
        );
      case 4:
        return (
          <QuizCard
            title="Write from the heart"
            subtitle="Say what you've always wanted to say."
          >
            <Step5Message data={data} errors={errors} updateData={updateData} />
          </QuizCard>
        );
      case 5:
        return (
          <QuizCard
            title="Almost there!"
            subtitle="Just a couple more details."
          >
            <Step6Language data={data} errors={errors} updateData={updateData} />
          </QuizCard>
        );
      default:
        return null;
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AnimatePresence mode="wait">
        {genStatus === 'generating' ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            className="flex-1 flex items-center justify-center"
          >
            <GeneratingOverlay
              recipientName={data.recipientName}
              reducedMotion={reducedMotion}
            />
          </motion.div>
        ) : genStatus === 'error' ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            className="flex-1 flex flex-col items-center justify-center gap-4 px-4"
          >
            <p className="text-red-600 text-center max-w-md">{genError}</p>
            <p className="text-sm text-muted-foreground">Your answers have been saved</p>
            <button
              type="button"
              onClick={() => {
                setGenStatus('idle');
                setGenError(null);
              }}
              className="bg-primary text-primary-foreground rounded-full px-8 py-3 font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            className="flex flex-col flex-1"
          >
            {/* Progress indicator */}
            <div className="py-4 flex justify-center">
              <QuizProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
            </div>

            {/* Step content */}
            <main className="flex items-start justify-center px-4 pt-4">
              <div className="relative overflow-hidden min-h-[400px] w-full max-w-2xl">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      duration: reducedMotion ? 0 : 0.3,
                      ease: 'easeInOut',
                    }}
                    className="w-full"
                  >
                    {renderStep()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>

            {/* Navigation */}
            <div className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto w-full">
              {/* Back button — hidden on Step 0 */}
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium min-h-11 min-w-11"
                  aria-label="Go back to previous step"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div aria-hidden="true" />
              )}

              {/* Next / Create My Song button */}
              <button
                type="button"
                onClick={goNext}
                disabled={isGenerating}
                className="bg-primary text-primary-foreground rounded-full px-8 py-3 font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLastStep ? 'Create My Song' : 'Next'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
