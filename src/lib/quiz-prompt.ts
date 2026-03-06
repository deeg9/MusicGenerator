import type { QuizData } from './quiz-types';
import type { SubmitJobParams } from './heartmula';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Default gift song duration: 90 seconds */
export const GIFT_SONG_DURATION_MS = 90_000;

// ─────────────────────────────────────────────────────────────────────────────
// Lookup tables
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps relationship types to mood descriptors used in the prompt.
 * The prompt should describe the emotional tone — NOT personal details.
 */
const RELATIONSHIP_MOOD: Record<string, string> = {
  Mom: 'warm, nurturing, deeply loving',
  Dad: 'proud, steadfast, deeply grateful',
  Partner: 'romantic, intimate, passionate',
  Friend: 'joyful, loyal, heartfelt',
  Child: 'tender, playful, unconditionally loving',
  Other: 'heartfelt and personal',
};

/**
 * Maps quiz genre labels to HeartMuLa tag strings.
 * Multiple tags are comma-separated.
 */
export const GENRE_TAG_MAP: Record<string, string> = {
  Pop: 'pop',
  'R&B': 'rnb, soul',
  Classical: 'orchestral, classical',
  Country: 'country',
  Jazz: 'jazz',
  Rock: 'rock',
  'Hip-Hop': 'hip-hop',
  Folk: 'folk, acoustic',
  Electronic: 'electronic, synth',
  Latin: 'latin',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the lyrics string from quiz data using ACE-Step structural tags.
 *
 * Structure:
 *   [Verse]   — qualities about the recipient
 *   [Chorus]  — personal message (if provided)
 *   [Verse]   — memories (only if provided)
 *   [Outro]   — closing with recipient's name
 */
function buildLyrics(data: QuizData): string {
  const name = data.recipientName.trim() || 'you';
  const sections: string[] = [];

  // Verse 1 — qualities
  const qualities = data.qualities.trim();
  const verse1Lines = qualities
    ? `${qualities}`
    : `Everything about ${name} makes this song worth singing`;
  sections.push(`[Verse]\n${verse1Lines}`);

  // Chorus — message (if present)
  const message = data.message.trim();
  if (message) {
    sections.push(`[Chorus]\n${message}`);
  } else {
    // Generic chorus fallback so there's always a chorus
    sections.push(`[Chorus]\nThis song is for ${name}, every word is true`);
  }

  // Verse 2 — memories (only if provided)
  const memories = data.memories.trim();
  if (memories) {
    sections.push(`[Verse]\n${memories}`);
  }

  // Outro — closing with name
  sections.push(`[Outro]\nThis is for ${name} — with all my love`);

  return sections.join('\n\n');
}

/**
 * Resolve the genre tag string from the quiz genre selection.
 * Falls back to lowercase of the genre label for unmapped genres.
 */
function resolveGenreTag(genre: string): string {
  return GENRE_TAG_MAP[genre] ?? genre.toLowerCase();
}

/**
 * Build the complete tags string from genre and voice preference.
 */
function buildTags(data: QuizData): string {
  const genreTag = resolveGenreTag(data.genre);
  const parts = [genreTag];

  if (data.voicePreference === 'Male') {
    parts.push('male vocals');
  } else if (data.voicePreference === 'Female') {
    parts.push('female vocals');
  }

  return parts.join(', ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert QuizData into a HeartMuLa SubmitJobParams.
 *
 * Key design decisions (per research findings):
 * - `prompt` is genre/mood only — no personal content (prevents LLM stripping)
 * - `lyrics` carries all personal content (name, qualities, memories, message)
 * - `enhancePrompt` is NOT called — personal content risk
 * - `duration_ms` is always GIFT_SONG_DURATION_MS (90s)
 */
export function quizToPrompt(data: QuizData): SubmitJobParams {
  const mood = RELATIONSHIP_MOOD[data.relationshipType] ?? 'heartfelt and personal';
  const genre = data.genre || 'Pop';

  const prompt = `A ${genre} song — ${mood}. Written as a personal gift.`;
  const lyrics = buildLyrics(data);
  const tags = buildTags(data);

  return {
    prompt,
    lyrics,
    duration_ms: GIFT_SONG_DURATION_MS,
    tags,
  };
}
