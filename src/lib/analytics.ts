import posthog from 'posthog-js';

// ─── Quiz Funnel ──────────────────────────────────────────────────────────────

export function trackQuizStarted(): void {
  posthog.capture('quiz_started');
}

export function trackQuizStepCompleted(
  stepNumber: number,
  stepName: string,
  timeOnStepMs: number,
): void {
  posthog.capture('quiz_step_completed', {
    step_number: stepNumber,
    step_name: stepName,
    time_on_step_ms: timeOnStepMs,
  });
}

export function trackQuizStepBack(fromStep: number, fromStepName: string): void {
  posthog.capture('quiz_step_back', {
    from_step: fromStep,
    from_step_name: fromStepName,
  });
}

export function trackQuizCompleted(data: {
  totalTimeMs: number;
  occasion: string;
  genre: string;
  voice: string;
  language: string;
}): void {
  posthog.capture('quiz_completed', {
    total_time_ms: data.totalTimeMs,
    occasion: data.occasion,
    genre: data.genre,
    voice: data.voice,
    language: data.language,
  });
}

// ─── Song Generation ──────────────────────────────────────────────────────────

export function trackSongGenerationStarted(jobId: string, songId: string): void {
  posthog.capture('song_generation_started', {
    job_id: jobId,
    song_id: songId,
  });
}

export function trackSongGenerationCompleted(
  songId: string,
  generationTimeMs: number,
): void {
  posthog.capture('song_generation_completed', {
    song_id: songId,
    generation_time_ms: generationTimeMs,
  });
}

export function trackSongGenerationFailed(errorType: string): void {
  posthog.capture('song_generation_failed', {
    error_type: errorType,
  });
}

// ─── Engagement ───────────────────────────────────────────────────────────────

export function trackSongPlayed(
  songId: string,
  source: 'success_page' | 'listen_page' | 'dashboard',
): void {
  posthog.capture('song_played', {
    song_id: songId,
    source,
  });
}

export function trackSongPlayCompleted(songId: string, source: string): void {
  posthog.capture('song_play_completed', {
    song_id: songId,
    source,
  });
}

export function trackEmailFormSubmitted(songId: string): void {
  posthog.capture('email_form_submitted', {
    song_id: songId,
  });
}

export function trackListenPageOpened(songId: string): void {
  posthog.capture('listen_page_opened', {
    song_id: songId,
  });
}

export function trackSongShared(songId: string): void {
  posthog.capture('song_shared', {
    song_id: songId,
  });
}

export function trackSongDownloaded(songId: string): void {
  posthog.capture('song_downloaded', {
    song_id: songId,
  });
}

// ─── Acquisition ──────────────────────────────────────────────────────────────

export function trackCtaClicked(ctaLocation: string, ctaText: string): void {
  posthog.capture('cta_clicked', {
    cta_location: ctaLocation,
    cta_text: ctaText,
  });
}

// ─── Identity ─────────────────────────────────────────────────────────────────

export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>,
): void {
  posthog.identify(userId, properties);
}
