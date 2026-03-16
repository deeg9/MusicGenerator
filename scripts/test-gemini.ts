/**
 * Standalone test script for Gemini prompt enhancement.
 * Usage: npx tsx scripts/test-gemini.ts
 *
 * Tests that Gemini 2.5 Flash can enhance quiz data into professional lyrics
 * using the same system prompt and parsing logic as quiz-prompt.ts.
 */

import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load .env.local
config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

// ─── Same system prompt as quiz-prompt.ts ────────────────────────────────────

const SONG_WRITER_SYSTEM_PROMPT = `You are a professional songwriter and emotional interpreter. Your job is to take personal details about a gift recipient and craft beautiful, professional song lyrics.

## Your Process

1. **Interpret the Emotional Story**: Analyze the quiz answers to understand:
   - The relationship dynamic and emotional depth
   - The mood, imagery, and unspoken feelings behind their words
   - What makes this person and relationship truly special
   - The core emotional message the gift-giver wants to convey

2. **Write Professional Song Lyrics** following these rules:
   - Use this exact structure: [Verse 1], [Chorus], [Verse 2], [Chorus], [Bridge], [Chorus]
   - Create strong rhyme schemes (ABAB or AABB) with natural, conversational language
   - Use vivid imagery and storytelling — show, don't tell
   - Weave the recipient's name naturally into the lyrics (1-3 times, not forced)
   - Transform their specific memories and qualities into poetic lyrics
   - Write a memorable, repeating chorus with a radio-ready hook
   - Keep language warm and authentic — avoid clichés like "through thick and thin"
   - Each verse should be 4-6 lines, chorus 4-6 lines, bridge 2-4 lines

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
\`\`\`

Write the lyrics in the language specified by the user. If no language is specified, default to English.`;

// ─── Sample quiz data ────────────────────────────────────────────────────────

const sampleQuizData = {
  recipientName: 'Sarah',
  relationshipType: 'Partner',
  genre: 'Pop',
  voicePreference: 'Female',
  qualities: 'She has the most infectious laugh and always knows how to make everyone feel welcome. She lights up every room.',
  memories: 'Our first road trip to Big Sur — we got lost, sang terrible karaoke in the car, and watched the sunset from that cliff.',
  message: 'You are my favorite adventure. Every day with you feels like coming home.',
  language: 'English',
};

// ─── Same formatting as quiz-prompt.ts formatQuizForGemini() ─────────────────

function formatQuizForGemini(data: typeof sampleQuizData): string {
  const lines = [
    `Recipient Name: ${data.recipientName}`,
    `Relationship: ${data.relationshipType || 'Someone special'}`,
    `Genre: ${data.genre}`,
    `Voice Preference: ${data.voicePreference || 'No Preference'}`,
    `What makes them special: ${data.qualities || '(not provided)'}`,
    `A special memory: ${data.memories || '(not provided)'}`,
    `Message from the heart: ${data.message || '(not provided)'}`,
    `Language: ${data.language || 'English'}`,
  ];
  return lines.join('\n');
}

// ─── Same parsing as quiz-prompt.ts parseGeminiResponse() ────────────────────

function parseGeminiResponse(response: string): { prompt: string; lyrics: string } {
  const promptMatch = response.match(/PROMPT:\s*(.+)/i);
  if (!promptMatch) throw new Error('Missing PROMPT section in Gemini response');

  const lyricsMatch = response.match(/LYRICS:\s*\n([\s\S]+)/i);
  if (!lyricsMatch) throw new Error('Missing LYRICS section in Gemini response');

  const lyrics = lyricsMatch[1].trim();
  if (lyrics.length < 50) throw new Error('Lyrics too short — likely incomplete');

  return {
    prompt: promptMatch[1].trim(),
    lyrics,
  };
}

// ─── Raw template output (same as quizToPrompt) ─────────────────────────────

function rawTemplateOutput(data: typeof sampleQuizData): { prompt: string; lyrics: string } {
  const mood = 'romantic, intimate, passionate'; // Partner mood from RELATIONSHIP_MOOD
  const prompt = `A ${data.genre} song — ${mood}. Written as a personal gift.`;

  const name = data.recipientName.trim() || 'you';
  const sections: string[] = [];

  sections.push(`[Verse]\n${data.qualities}`);

  if (data.message) {
    sections.push(`[Chorus]\n${data.message}`);
  } else {
    sections.push(`[Chorus]\nThis song is for ${name}, every word is true`);
  }

  if (data.memories) {
    sections.push(`[Verse]\n${data.memories}`);
  }

  sections.push(`[Outro]\nThis is for ${name} — with all my love`);

  return { prompt, lyrics: sections.join('\n\n') };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Gemini Prompt Enhancement Test ===\n');

  // 1. Show raw template
  const raw = rawTemplateOutput(sampleQuizData);
  console.log('── Raw Template Output ──');
  console.log(`Prompt: ${raw.prompt}`);
  console.log(`Lyrics:\n${raw.lyrics}\n`);

  // 2. Call Gemini
  console.log('── Calling Gemini 2.5 Flash ──');
  const userMessage = formatQuizForGemini(sampleQuizData);
  console.log(`User message:\n${userMessage}\n`);

  const client = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SONG_WRITER_SYSTEM_PROMPT,
  });

  const start = performance.now();

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    });

    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    const responseText = result.response.text();

    console.log(`✅ Gemini API call succeeded (${elapsed}s)\n`);
    console.log('── Raw Gemini Response ──');
    console.log(responseText);
    console.log('');

    // 3. Parse response
    const parsed = parseGeminiResponse(responseText);

    console.log('── Parsed Output ──');
    console.log(`Enhanced Prompt: ${parsed.prompt}`);
    console.log(`\nEnhanced Lyrics:\n${parsed.lyrics}`);
    console.log(`\n✅ Response parsed successfully`);
    console.log(`   Lyrics length: ${parsed.lyrics.length} chars`);
    console.log(`   Contains [Verse 1]: ${parsed.lyrics.includes('[Verse 1]')}`);
    console.log(`   Contains [Chorus]: ${parsed.lyrics.includes('[Chorus]')}`);
    console.log(`   Contains [Bridge]: ${parsed.lyrics.includes('[Bridge]')}`);
    console.log(`   Contains "Sarah": ${parsed.lyrics.includes('Sarah')}`);
  } catch (err) {
    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    console.error(`❌ Failed after ${elapsed}s:`, err);
    process.exit(1);
  }
}

main();
