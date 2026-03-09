import { getEnv } from '@/env';

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
  r2_wav_key?: string;
  r2_mp3_key?: string;
  error_msg?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// RunPod Serverless API
// ─────────────────────────────────────────────────────────────────────────────

const RUNPOD_BASE = () => {
  const endpointId = getEnv().RUNPOD_ENDPOINT_ID;
  if (!endpointId) {
    throw new Error('RUNPOD_ENDPOINT_ID is not set. Music generation is unavailable in this environment.');
  }
  return `https://api.runpod.ai/v2/${endpointId}`;
};

function runpodHeaders(): HeadersInit {
  const apiKey = getEnv().RUNPOD_API_KEY;
  if (!apiKey) {
    throw new Error('RUNPOD_API_KEY is not set. Music generation is unavailable in this environment.');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

/**
 * Map RunPod job statuses to our internal status enum.
 *
 * RunPod statuses: IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED, CANCELLED, TIMED_OUT
 */
function mapRunPodStatus(status: string): HeartMuLaStatus {
  switch (status) {
    case 'COMPLETED':
      return 'COMPLETED';
    case 'IN_PROGRESS':
      return 'PROCESSING';
    case 'FAILED':
    case 'CANCELLED':
    case 'TIMED_OUT':
      return 'FAILED';
    case 'IN_QUEUE':
    default:
      return 'QUEUED';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API Client
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit a music generation job to RunPod Serverless.
 *
 * The handler receives: lyrics, tags, duration_ms, song_id, seed
 * and uploads WAV + MP3 to R2 directly.
 *
 * Endpoint: POST https://api.runpod.ai/v2/{ENDPOINT_ID}/run
 */
export async function submitGenerationJob(
  params: SubmitJobParams,
  songId: string,
): Promise<SubmitJobResponse> {
  const body = {
    input: {
      lyrics: params.lyrics,
      tags: params.tags ?? '',
      duration_ms: params.duration_ms,
      song_id: songId,
      ...(params.seed !== undefined ? { seed: params.seed } : {}),
    },
  };

  const response = await fetch(`${RUNPOD_BASE()}/run`, {
    method: 'POST',
    headers: runpodHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `RunPod submit failed: HTTP ${response.status} ${response.statusText} — ${text}`,
    );
  }

  const data = (await response.json()) as { id?: string; status?: string };

  if (!data.id) {
    throw new Error(
      `RunPod submit returned unexpected response (no id): ${JSON.stringify(data)}`,
    );
  }

  return { job_id: data.id, status: mapRunPodStatus(data.status ?? 'IN_QUEUE') };
}

/**
 * Query the status of a RunPod Serverless job.
 *
 * When COMPLETED, the output contains { r2_wav_key, r2_mp3_key } from the handler.
 *
 * Endpoint: GET https://api.runpod.ai/v2/{ENDPOINT_ID}/status/{jobId}
 */
export async function queryJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${RUNPOD_BASE()}/status/${jobId}`, {
    headers: runpodHeaders(),
  });

  if (!response.ok) {
    throw new Error(
      `RunPod query failed: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    status?: string;
    output?: {
      r2_wav_key?: string;
      r2_mp3_key?: string;
    };
    error?: string;
  };

  const status = mapRunPodStatus(data.status ?? 'IN_QUEUE');

  return {
    status,
    r2_wav_key: data.output?.r2_wav_key,
    r2_mp3_key: data.output?.r2_mp3_key,
    error_msg: data.error ?? undefined,
  };
}
