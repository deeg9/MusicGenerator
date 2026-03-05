import { env } from '@/env';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FormatInputParams {
  prompt: string;   // user's vibe description (with genre tags pre-concatenated)
  lyrics: string;   // user's lyrics or "[Instrumental]"
}

export interface FormatInputResult {
  caption: string;          // LLM-enhanced caption — becomes the `prompt` for release_task
  bpm: number | string;     // numeric BPM
  keyscale: string;         // e.g. "C major"
  timesignature: string;    // e.g. "4"
  lyrics: string;           // may be reformatted by LLM
  language: string;
}

export interface SubmitJobParams {
  prompt: string;
  lyrics: string;
  audioDuration?: number;   // seconds, default 120
  batchSize?: number;       // number of variants, default 2
  bpm?: number;
  keyScale?: string;        // e.g. "C major"
  timeSignature?: string;   // "2" | "3" | "4" | "6"
  seed?: number;            // -1 for random
}

export interface SubmitJobResponse {
  task_id: string;
}

export type JobStatusCode = 0 | 1 | 2; // 0 = queued/running, 1 = succeeded, 2 = failed

export interface JobStatusData {
  audio_urls?: string[];    // relative paths on the ACE-Step server
}

export interface QueryJobStatusResponse {
  status: JobStatusCode;
  data: JobStatusData | null;
  error: string | null;
  timestamp?: number;
  code?: number;
}

interface RawQueryResultItem {
  task_id: string;
  result: string; // JSON-encoded string
  status: JobStatusCode;
}

interface RawQueryResultEnvelope {
  data: RawQueryResultItem[];
  code: number;
  error: string | null;
  timestamp?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Allow Node.js to exit even if timer is pending
  if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
    (timer as NodeJS.Timeout).unref();
  }
  return controller.signal;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Client
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit an async generation job to the ACE-Step API.
 * Returns a task_id — use queryJobStatus() to poll for completion.
 *
 * Endpoint: POST /release_task
 */
export async function submitGenerationJob(params: SubmitJobParams): Promise<SubmitJobResponse> {
  const body: Record<string, unknown> = {
    prompt: params.prompt,
    lyrics: params.lyrics,
    audio_duration: params.audioDuration ?? 120,
    batch_size: params.batchSize ?? 2,
    use_random_seed: params.seed === undefined || params.seed === -1,
  };

  if (params.bpm !== undefined) body.bpm = params.bpm;
  if (params.keyScale !== undefined) body.key_scale = params.keyScale;
  if (params.timeSignature !== undefined) body.time_signature = params.timeSignature;
  if (params.seed !== undefined) body.seed = params.seed;

  const response = await fetch(`${env.RUNPOD_URL}/release_task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: createTimeoutSignal(30_000), // 30 second timeout for job submission
  });

  if (!response.ok) {
    throw new Error(`ACE-Step submit failed: HTTP ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;

  // task_id may be top-level or inside data envelope
  const taskId =
    (data.task_id as string | undefined) ??
    ((data.data as Record<string, unknown> | undefined)?.task_id as string | undefined);

  if (!taskId) {
    throw new Error(
      `ACE-Step submit returned unexpected response (no task_id): ${JSON.stringify(data)}`,
    );
  }

  return { task_id: taskId };
}

/**
 * Query the status of a submitted generation job.
 * Poll this every 2.5-3 seconds until status === 1 (succeeded) or 2 (failed).
 *
 * Status codes:
 *   0 = queued or running
 *   1 = succeeded (check data.audio_urls)
 *   2 = failed (check error)
 *
 * Endpoint: POST /query_result
 * Timeout: 90 seconds (10x expected max generation time on RTX 3090)
 */
export async function queryJobStatus(taskId: string): Promise<QueryJobStatusResponse> {
  const response = await fetch(`${env.RUNPOD_URL}/query_result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id_list: [taskId] }),
    signal: createTimeoutSignal(90_000), // 90 second timeout per poll call
  });

  if (!response.ok) {
    throw new Error(`ACE-Step query failed: HTTP ${response.status} ${response.statusText}`);
  }

  const raw = (await response.json()) as RawQueryResultEnvelope;

  // Response format: { data: [{ task_id, result: "JSON string", status }], code, error }
  const taskResult = raw.data?.[0];

  if (!taskResult) {
    // No task data returned — treat as still running
    return { status: 0, data: null, error: null, timestamp: raw.timestamp, code: raw.code };
  }

  const statusCode = taskResult.status;
  let audioUrls: string[] = [];

  if (statusCode === 1 && taskResult.result) {
    try {
      // result is a JSON string containing array of { file, generation_info }
      const parsed = JSON.parse(taskResult.result) as Array<{ file?: string }>;
      audioUrls = parsed
        .map((item) => item.file)
        .filter((f): f is string => typeof f === 'string');
    } catch {
      console.warn('[runpod] Failed to parse task result JSON:', taskResult.result);
    }
  }

  return {
    status: statusCode,
    data: audioUrls.length > 0 ? { audio_urls: audioUrls } : null,
    error: raw.error,
    timestamp: raw.timestamp,
    code: raw.code,
  };
}

/**
 * Call ACE-Step's /format_input endpoint to get an LLM-enhanced caption with
 * BPM, key, and time signature metadata derived from the user's prompt.
 *
 * This should be called before submitGenerationJob so that the AI model
 * receives a structured musical description rather than raw user text.
 *
 * Endpoint: POST /format_input
 * Timeout: 30 seconds
 */
export async function callFormatInput(params: FormatInputParams): Promise<FormatInputResult> {
  const response = await fetch(`${env.RUNPOD_URL}/format_input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: params.prompt, lyrics: params.lyrics }),
    signal: createTimeoutSignal(30_000),
  });

  if (!response.ok) {
    throw new Error(`ACE-Step format_input failed: HTTP ${response.status} ${response.statusText}`);
  }

  const raw = (await response.json()) as { data: Record<string, unknown>; code: number; error: string | null };

  // Log raw response on first call to validate field names from the live API
  console.log('[runpod] format_input raw response:', JSON.stringify(raw.data));

  if (raw.error) {
    throw new Error(`ACE-Step format_input error: ${raw.error}`);
  }

  const data = raw.data;
  return {
    caption: data.caption as string,
    bpm: data.bpm as number | string,
    keyscale: (data.keyscale ?? data.keyScale ?? '') as string,
    timesignature: (data.timesignature ?? data.timeSignature ?? '') as string,
    lyrics: (data.lyrics ?? '') as string,
    language: (data.language ?? '') as string,
  };
}

/**
 * Download an audio file from the ACE-Step server.
 * audio_urls in the query_result response are relative paths on the server.
 * This fetches the actual bytes and returns them as a Buffer.
 *
 * Example path: "/v1/audio?path=outputs/abc123_0.wav"
 */
export async function fetchAudioBuffer(audioPath: string): Promise<Buffer> {
  const url = audioPath.startsWith('http') ? audioPath : `${env.RUNPOD_URL}${audioPath}`;

  const response = await fetch(url, {
    signal: createTimeoutSignal(30_000), // 30 second timeout for audio download
  });

  if (!response.ok) {
    throw new Error(`Audio download failed: HTTP ${response.status} ${response.statusText} — ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
