import { describe, it, expect } from 'vitest';
import { quizToPrompt, GIFT_SONG_DURATION_MS } from './quiz-prompt';
import type { QuizData } from './quiz-types';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const BASE_QUIZ: QuizData = {
  relationshipType: 'Mom',
  recipientName: 'Sarah',
  genre: 'Pop',
  voicePreference: 'Female',
  qualities: 'caring, patient, always there for me',
  memories: 'Sunday morning pancakes and road trips',
  message: 'Thank you for everything you do',
  language: 'English',
  email: 'test@example.com',
};

// ─────────────────────────────────────────────────────────────────────────────
// GIFT_SONG_DURATION_MS
// ─────────────────────────────────────────────────────────────────────────────

describe('GIFT_SONG_DURATION_MS', () => {
  it('equals 210000 ms (3.5 minutes)', () => {
    expect(GIFT_SONG_DURATION_MS).toBe(210_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Output shape
// ─────────────────────────────────────────────────────────────────────────────

describe('quizToPrompt — output shape', () => {
  it('returns an object with prompt, lyrics, duration_ms, and tags', () => {
    const result = quizToPrompt(BASE_QUIZ);
    expect(result).toHaveProperty('prompt');
    expect(result).toHaveProperty('lyrics');
    expect(result).toHaveProperty('duration_ms');
    expect(result).toHaveProperty('tags');
  });

  it('sets duration_ms to GIFT_SONG_DURATION_MS (210000)', () => {
    const result = quizToPrompt(BASE_QUIZ);
    expect(result.duration_ms).toBe(210_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Prompt field
// ─────────────────────────────────────────────────────────────────────────────

describe('quizToPrompt — prompt field', () => {
  it('does NOT include recipient name in the prompt', () => {
    const result = quizToPrompt(BASE_QUIZ);
    expect(result.prompt).not.toContain('Sarah');
  });

  it('does NOT include personal qualities in the prompt', () => {
    const result = quizToPrompt(BASE_QUIZ);
    expect(result.prompt).not.toContain('caring');
  });

  it('does NOT include memories in the prompt', () => {
    const result = quizToPrompt(BASE_QUIZ);
    expect(result.prompt).not.toContain('pancakes');
  });

  it('includes genre in the prompt', () => {
    const result = quizToPrompt(BASE_QUIZ);
    expect(result.prompt.toLowerCase()).toContain('pop');
  });

  it('includes relationship mood descriptor in the prompt', () => {
    const result = quizToPrompt(BASE_QUIZ);
    // Mom -> warm, nurturing mood
    expect(result.prompt.toLowerCase()).toMatch(/warm|nurtur|loving/);
  });

  it('mentions "personal gift" or similar framing in the prompt', () => {
    const result = quizToPrompt(BASE_QUIZ);
    expect(result.prompt.toLowerCase()).toContain('gift');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Lyrics field
// ─────────────────────────────────────────────────────────────────────────────

describe('quizToPrompt — lyrics field', () => {
  it('includes recipient name in lyrics', () => {
    const result = quizToPrompt(BASE_QUIZ);
    expect(result.lyrics).toContain('Sarah');
  });

  it('includes qualities in lyrics', () => {
    const result = quizToPrompt(BASE_QUIZ);
    expect(result.lyrics).toContain('caring');
  });

  it('includes message in lyrics', () => {
    const result = quizToPrompt(BASE_QUIZ);
    expect(result.lyrics).toContain('Thank you for everything you do');
  });

  it('includes memories in lyrics when provided', () => {
    const result = quizToPrompt(BASE_QUIZ);
    expect(result.lyrics).toContain('pancakes');
  });

  it('uses structural tags [Verse], [Chorus], [Bridge], [Outro]', () => {
    const result = quizToPrompt(BASE_QUIZ);
    expect(result.lyrics).toContain('[Verse]');
    expect(result.lyrics).toContain('[Chorus]');
    expect(result.lyrics).toContain('[Bridge]');
    expect(result.lyrics).toContain('[Outro]');
  });

  it('skips memories section when memories is empty', () => {
    const noMemories = { ...BASE_QUIZ, memories: '' };
    const result = quizToPrompt(noMemories);
    // Should not have a second [Verse] if there are no memories
    const verseCount = (result.lyrics.match(/\[Verse\]/g) ?? []).length;
    expect(verseCount).toBe(1);
  });

  it('falls back to "you" in lyrics when recipientName is empty', () => {
    const noName = { ...BASE_QUIZ, recipientName: '' };
    const result = quizToPrompt(noName);
    expect(result.lyrics.toLowerCase()).toContain('you');
    // Should not contain an empty string artifact from name
    expect(result.lyrics).not.toMatch(/,\s*,/); // no double commas
  });

  it('skips message section gracefully when message is empty', () => {
    const noMessage = { ...BASE_QUIZ, message: '' };
    const result = quizToPrompt(noMessage);
    // Should still have lyrics structure
    expect(result.lyrics).toContain('[Verse]');
    expect(result.lyrics).toContain('[Outro]');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Genre tag mapping
// ─────────────────────────────────────────────────────────────────────────────

describe('quizToPrompt — genre tag mapping', () => {
  it('maps Pop to "pop"', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, genre: 'Pop' });
    expect(result.tags).toContain('pop');
  });

  it('maps R&B to "rnb, soul"', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, genre: 'R&B' });
    expect(result.tags).toContain('rnb');
    expect(result.tags).toContain('soul');
  });

  it('maps Classical to "orchestral, classical"', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, genre: 'Classical' });
    expect(result.tags).toContain('orchestral');
    expect(result.tags).toContain('classical');
  });

  it('maps Country to "country"', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, genre: 'Country' });
    expect(result.tags).toContain('country');
  });

  it('maps Jazz to "jazz"', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, genre: 'Jazz' });
    expect(result.tags).toContain('jazz');
  });

  it('maps Rock to "rock"', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, genre: 'Rock' });
    expect(result.tags).toContain('rock');
  });

  it('maps unknown genres to lowercase version', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, genre: 'Bossa Nova' });
    expect(result.tags).toContain('bossa nova');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Voice preference in tags
// ─────────────────────────────────────────────────────────────────────────────

describe('quizToPrompt — voice preference in tags', () => {
  it('appends "male vocals" to tags when voice preference is Male', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, voicePreference: 'Male' });
    expect(result.tags).toContain('male vocals');
  });

  it('appends "female vocals" to tags when voice preference is Female', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, voicePreference: 'Female' });
    expect(result.tags).toContain('female vocals');
  });

  it('does NOT append voice tag when preference is No Preference', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, voicePreference: 'No Preference' });
    expect(result.tags).not.toContain('vocals');
  });
});
