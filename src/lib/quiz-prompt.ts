import type { QuizData } from './quiz-types';
import type { SubmitJobParams } from './heartmula';
import { generateContent, RateLimitError } from './gemini';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Default gift song duration: 3.5 minutes */
export const GIFT_SONG_DURATION_MS = 210_000;

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
  'R&B / Soul': 'rnb, soul',
  Classical: 'orchestral, classical',
  Country: 'country',
  Jazz: 'jazz',
  Rock: 'rock',
  'Hip-Hop': 'hip-hop',
  Folk: 'folk, acoustic',
  'Folk / Acoustic': 'folk, acoustic',
  Electronic: 'electronic, synth',
  Latin: 'latin',
  Reggae: 'reggae',
  Blues: 'blues',
  Gospel: 'gospel, choir',
  Indie: 'indie, alternative',
  Lullaby: 'lullaby, soft, gentle',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the lyrics string from quiz data using structural tags.
 *
 * Structure:
 *   [Verse]   — qualities about the recipient
 *   [Chorus]  — personal message (if provided)
 *   [Verse]   — memories (only if provided)
 *   [Bridge]  — reflective/emotional pivot
 *   [Chorus]  — repeat chorus
 *   [Outro]   — soft closing with recipient's name
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
  const chorusContent = message
    ? message
    : `This song is for ${name}, every word is true`;
  sections.push(`[Chorus]\n${chorusContent}`);

  // Verse 2 — memories (only if provided)
  const memories = data.memories.trim();
  if (memories) {
    sections.push(`[Verse]\n${memories}`);
  }

  // Bridge — reflective emotional pivot
  sections.push(`[Bridge]\nThrough every moment, ${name}, you mean the world to me`);

  // Repeat chorus
  sections.push(`[Chorus]\n${chorusContent}`);

  // Outro — soft closing with name
  sections.push(`[Outro]\nSoftly now, this is for ${name} — always and forever`);

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
 * Build the complete tags string from genre, voice preference, energy, and instrumental.
 */
function buildTags(data: QuizData): string {
  const genreTag = resolveGenreTag(data.genre);
  const parts = [genreTag];

  if (data.instrumental) {
    // Instrumental: skip all voice tags, add instrumental tag
    parts.push('instrumental');
  } else if (data.voicePreference === 'Male') {
    parts.push('male vocals');
  } else if (data.voicePreference === 'Female') {
    parts.push('female vocals');
  } else if (data.voicePreference === 'Duet') {
    parts.push('duet, male vocals, female vocals');
  } else if (data.voicePreference === 'Choir') {
    parts.push('choir vocals');
  }

  if (data.energy === 'low') {
    parts.push('mellow, slow tempo');
  } else if (data.energy === 'medium') {
    parts.push('moderate tempo');
  } else if (data.energy === 'high') {
    parts.push('energetic, upbeat');
  }

  parts.push('full song', 'natural ending');

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
 * - `duration_ms` is always GIFT_SONG_DURATION_MS (3.5 min)
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

// ─────────────────────────────────────────────────────────────────────────────
// Gemini-enhanced prompt generation
// ─────────────────────────────────────────────────────────────────────────────

const SONG_WRITER_SYSTEM_PROMPT = `You are a professional songwriter and emotional interpreter. Your job is to take personal details about a gift recipient and craft beautiful, professional song lyrics.

## Your Process

1. **Interpret the Emotional Story**: Analyze the quiz answers to understand:
   - The relationship dynamic and emotional depth
   - The mood, imagery, and unspoken feelings behind their words
   - What makes this person and relationship truly special
   - The core emotional message the gift-giver wants to convey

2. **Write Professional Song Lyrics** following these rules:
   - Use this exact structure: [Verse 1], [Chorus], [Verse 2], [Chorus], [Bridge], [Chorus], [Outro]
   - Create strong rhyme schemes (ABAB or AABB) with natural, conversational language
   - Use vivid imagery and storytelling — show, don't tell
   - Weave the recipient's name naturally into the lyrics (1-3 times, not forced)
   - Transform their specific memories and qualities into poetic lyrics
   - Write a memorable, repeating chorus with a radio-ready hook
   - Keep language warm and authentic — avoid clichés like "through thick and thin"
   - Each verse should be 4-6 lines, chorus 4-6 lines, bridge 2-4 lines, outro 2-4 lines
   - The [Outro] should feel like a natural wind-down — use softer language, repetition, or a fade-out feeling

3. **Output Format** — You MUST output in exactly this format:
\`\`\`
PROMPT: A [genre] song — [2-3 word mood]. Written as a personal gift.
LYRICS:
[Verse 1]
(lyrics here)

[Chorus]
(lyrics here)

[Verse 2]
(lyrics here)

[Chorus]
(lyrics here)

[Bridge]
(lyrics here)

[Chorus]
(lyrics here)

[Outro]
(lyrics here)
\`\`\`

Write the lyrics in the language specified by the user. If no language is specified, default to English.`;

/**
 * Format quiz answers into the user message string for Gemini.
 */
function formatQuizForGemini(data: QuizData): string {
  const lines = [
    `Recipient Name: ${data.recipientName}`,
    `Relationship: ${data.relationshipType || 'Someone special'}`,
    `Genre: ${data.genre}`,
    `Voice Preference: ${data.voicePreference || 'No Preference'}`,
    `Energy: ${data.energy || 'medium'}`,
    `Instrumental: ${data.instrumental ? 'Yes' : 'No'}`,
    `What makes them special: ${data.qualities || '(not provided)'}`,
    `A special memory: ${data.memories || '(not provided)'}`,
    `Message from the heart: ${data.message || '(not provided)'}`,
    `Language: ${data.language || 'English'}`,
  ];
  return lines.join('\n');
}

/**
 * Parse Gemini's response into prompt and lyrics sections.
 * Throws if the response doesn't contain the expected format.
 */
function parseGeminiResponse(response: string): { prompt: string; lyrics: string } {
  // Extract PROMPT line
  const promptMatch = response.match(/PROMPT:\s*(.+)/i);
  if (!promptMatch) throw new Error('Missing PROMPT section in Gemini response');

  // Extract LYRICS section (everything after "LYRICS:")
  const lyricsMatch = response.match(/LYRICS:\s*\n([\s\S]+)/i);
  if (!lyricsMatch) throw new Error('Missing LYRICS section in Gemini response');

  const lyrics = lyricsMatch[1].trim();
  if (lyrics.length < 50) throw new Error('Lyrics too short — likely incomplete');

  return {
    prompt: promptMatch[1].trim(),
    lyrics,
  };
}

/**
 * Enhanced quiz-to-prompt using Gemini Flash for professional lyrics.
 * Falls back to quizToPrompt() on any failure.
 */
export async function enhanceQuizPrompt(data: QuizData, ip?: string | null): Promise<SubmitJobParams> {
  try {
    const userMessage = formatQuizForGemini(data);
    const response = await generateContent(SONG_WRITER_SYSTEM_PROMPT, userMessage, ip);
    const parsed = parseGeminiResponse(response);

    // Tags come from OUR lookup tables, not Gemini (prevents hallucinated tags)
    const tags = buildTags(data);

    console.log('[quiz-prompt] Gemini enhanced lyrics generated successfully');

    return {
      prompt: parsed.prompt,
      lyrics: parsed.lyrics,
      duration_ms: GIFT_SONG_DURATION_MS,
      tags,
    };
  } catch (error) {
    // Let rate limit errors bubble up so the route can return 429
    if (error instanceof RateLimitError) throw error;
    console.warn('[quiz-prompt] Gemini enhancement failed, falling back to template:', error);
    return quizToPrompt(data);
  }
}
