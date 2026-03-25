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
  energy: '',
  instrumental: false,
  qualities: 'caring, patient, always there for me',
  memories: 'Sunday morning pancakes and road trips',
  message: 'Thank you for everything you do',
  language: 'English',
  email: 'test@example.com',
  recipientEmail: '',
  emailOptIn: false,
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

  it('appends duet tags when voice preference is Duet', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, voicePreference: 'Duet' });
    expect(result.tags).toContain('duet');
  });

  it('appends choir vocals when voice preference is Choir', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, voicePreference: 'Choir' });
    expect(result.tags).toContain('choir vocals');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// New genre tag mappings
// ─────────────────────────────────────────────────────────────────────────────

describe('quizToPrompt — new genre tag mappings', () => {
  it('maps Reggae to "reggae"', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, genre: 'Reggae' });
    expect(result.tags).toContain('reggae');
  });

  it('maps Blues to "blues"', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, genre: 'Blues' });
    expect(result.tags).toContain('blues');
  });

  it('maps Gospel to "gospel" and "choir"', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, genre: 'Gospel' });
    expect(result.tags).toContain('gospel');
    expect(result.tags).toContain('choir');
  });

  it('maps Indie to "indie" and "alternative"', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, genre: 'Indie' });
    expect(result.tags).toContain('indie');
    expect(result.tags).toContain('alternative');
  });

  it('maps Lullaby to "lullaby", "soft", and "gentle"', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, genre: 'Lullaby' });
    expect(result.tags).toContain('lullaby');
    expect(result.tags).toContain('soft');
    expect(result.tags).toContain('gentle');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Instrumental tag
// ─────────────────────────────────────────────────────────────────────────────

describe('quizToPrompt — instrumental flag', () => {
  it('adds instrumental tag and omits voice tags when instrumental is true', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, instrumental: true, voicePreference: 'Female' });
    expect(result.tags).toContain('instrumental');
    expect(result.tags).not.toContain('female vocals');
    expect(result.tags).not.toContain('male vocals');
  });

  it('does not add instrumental tag when instrumental is false', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, instrumental: false });
    expect(result.tags).not.toContain('instrumental');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Energy tags
// ─────────────────────────────────────────────────────────────────────────────

describe('quizToPrompt — energy tags', () => {
  it('adds energy tags for high energy', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, energy: 'high' });
    expect(result.tags).toMatch(/energetic|upbeat/);
  });

  it('adds energy tags for low energy', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, energy: 'low' });
    expect(result.tags).toContain('mellow');
  });

  it('adds energy tags for medium energy', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, energy: 'medium' });
    expect(result.tags).toContain('moderate tempo');
  });

  it('does not add energy tags when energy is empty', () => {
    const result = quizToPrompt({ ...BASE_QUIZ, energy: '' });
    expect(result.tags).not.toContain('mellow');
    expect(result.tags).not.toContain('moderate tempo');
    expect(result.tags).not.toContain('energetic');
  });
});
