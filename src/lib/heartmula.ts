import { env } from '@/env';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SubmitJobParams {
  prompt: string;
  lyrics: string;
  duration_ms: number;
  tags?: string;
  seed?: number;
}

export interface SubmitJobResponse {
  job_id: string;
  status: string;
}

export type HeartMuLaStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface JobStatusResponse {
  status: HeartMuLaStatus;
  audio_path?: string;
  error_msg?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
    (timer as NodeJS.Timeout).unref();
  }
  return controller.signal;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Client
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enhance a user prompt via HeartMuLa's LLM endpoint.
 * Returns the enhanced prompt string, or falls back to the original on failure.
 */
export async function enhancePrompt(prompt: string, tags?: string): Promise<string> {
  try {
    const body: Record<string, unknown> = { prompt };
    if (tags) body.tags = tags;

    const response = await fetch(`${env.HEARTMULA_URL}/generate/enhance_prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: createTimeoutSignal(30_000),
    });

    if (!response.ok) {
      console.warn(`[heartmula] enhance_prompt failed: HTTP ${response.status}`);
      return prompt;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const enhanced = (data.enhanced_prompt ?? data.prompt ?? prompt) as string;
    return enhanced;
  } catch (err) {
    console.warn('[heartmula] enhance_prompt error, using original prompt:', err);
    return prompt;
  }
}

/**
 * Submit a music generation job to HeartMuLa Studio.
 * Returns a job_id for polling.
 *
 * Endpoint: POST /generate/music
 */
export async function submitGenerationJob(params: SubmitJobParams): Promise<SubmitJobResponse> {
  const body: Record<string, unknown> = {
    prompt: params.prompt,
    lyrics: params.lyrics,
    duration_ms: params.duration_ms,
  };

  if (params.tags) body.tags = params.tags;
  if (params.seed !== undefined) body.seed = params.seed;

  const response = await fetch(`${env.HEARTMULA_URL}/generate/music`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: createTimeoutSignal(30_000),
  });

  if (!response.ok) {
    throw new Error(`HeartMuLa submit failed: HTTP ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const jobId = data.job_id as string | undefined;

  if (!jobId) {
    throw new Error(
      `HeartMuLa submit returned unexpected response (no job_id): ${JSON.stringify(data)}`,
    );
  }

  return { job_id: jobId, status: (data.status as string) ?? 'QUEUED' };
}

/**
 * Query the status of a HeartMuLa generation job.
 *
 * Endpoint: GET /jobs/{jobId}
 */
export async function queryJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${env.HEARTMULA_URL}/jobs/${jobId}`, {
    signal: createTimeoutSignal(90_000),
  });

  if (!response.ok) {
    throw new Error(`HeartMuLa query failed: HTTP ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;

  return {
    status: ((data.status as string)?.toUpperCase() as HeartMuLaStatus) ?? 'QUEUED',
    audio_path: data.audio_path as string | undefined,
    error_msg: data.error_msg as string | undefined,
  };
}

/**
 * Download the generated audio track from HeartMuLa.
 * Returns the MP3 buffer directly.
 *
 * Endpoint: GET /download_track/{jobId}
 */
export async function fetchAudioBuffer(jobId: string): Promise<Buffer> {
  const url = `${env.HEARTMULA_URL}/download_track/${jobId}`;

  const response = await fetch(url, {
    signal: createTimeoutSignal(60_000),
  });

  if (!response.ok) {
    throw new Error(`Audio download failed: HTTP ${response.status} ${response.statusText} — ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
