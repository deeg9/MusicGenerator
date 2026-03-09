import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnv } from '@/env';

const MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 15_000;
const RATE_LIMIT_MAX = 100;        // max requests per window
const RATE_LIMIT_WINDOW_MS = 3_600_000; // 1 hour

// ─────────────────────────────────────────────────────────────────────────────
// In-memory rate limiter (per IP, sliding window)
// ─────────────────────────────────────────────────────────────────────────────

const ipTimestamps = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  let timestamps = ipTimestamps.get(ip);
  if (!timestamps) {
    timestamps = [];
    ipTimestamps.set(ip, timestamps);
  }

  // Prune old entries
  const firstValid = timestamps.findIndex((t) => t > cutoff);
  if (firstValid > 0) timestamps.splice(0, firstValid);
  else if (firstValid === -1) timestamps.length = 0;

  if (timestamps.length >= RATE_LIMIT_MAX) return true;

  timestamps.push(now);
  return false;
}

// Periodic cleanup of stale IPs (every 10 minutes)
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [ip, timestamps] of ipTimestamps) {
    if (timestamps.every((t) => t <= cutoff)) ipTimestamps.delete(ip);
  }
}, 600_000).unref();

export class RateLimitError extends Error {
  constructor() {
    super('Gemini rate limit exceeded (100/hour per IP)');
    this.name = 'RateLimitError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini client
// ─────────────────────────────────────────────────────────────────────────────

let clientInstance: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (clientInstance) return clientInstance;
  const apiKey = getEnv().GEMINI_API_KEY;
  if (!apiKey) return null;
  clientInstance = new GoogleGenerativeAI(apiKey);
  return clientInstance;
}

/**
 * Call Gemini Flash with a system prompt and user message.
 * Returns the generated text. Throws on timeout, rate limit, or API errors.
 *
 * @param ip - Client IP for rate limiting. Pass null to skip rate limiting.
 */
export async function generateContent(
  systemPrompt: string,
  userMessage: string,
  ip?: string | null,
): Promise<string> {
  if (ip && isRateLimited(ip)) throw new RateLimitError();

  const client = getClient();
  if (!client) throw new Error('GEMINI_API_KEY not configured');

  const model = client.getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    });
    return result.response.text();
  } finally {
    clearTimeout(timeout);
  }
}
