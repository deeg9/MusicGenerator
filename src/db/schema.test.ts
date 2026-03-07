/**
 * Schema export verification tests
 *
 * These tests verify that:
 * 1. The songs table and songStatusEnum are exported correctly
 * 2. Old exports (generations, outputs, etc.) no longer exist
 * 3. R2 key helpers produce correct path formats
 */

import { describe, it, expect, vi } from 'vitest';

// Mock @/env before any module that depends on it loads
vi.mock('@/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://postgres:password@localhost:5432/test',
    HEARTMULA_URL: 'http://localhost:8000',
    CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    R2_BUCKET_NAME: 'test-bucket',
  },
}));

// ─── Schema exports ──────────────────────────────────────────────────────────

describe('songs table', () => {
  it('exports songs table', async () => {
    const schema = await import('./schema');
    expect(schema.songs).toBeDefined();
  });

  it('songs table has all required columns', async () => {
    const { songs } = await import('./schema');
    const columns = Object.keys(songs);
    expect(columns).toContain('id');
    expect(columns).toContain('userId');
    expect(columns).toContain('sessionToken');
    expect(columns).toContain('status');
    expect(columns).toContain('heartbulaJobId');
    expect(columns).toContain('recipientName');
    expect(columns).toContain('relationship');
    expect(columns).toContain('genre');
    expect(columns).toContain('quizData');
    expect(columns).toContain('r2WavKey');
    expect(columns).toContain('r2Mp3Key');
    expect(columns).toContain('createdAt');
    expect(columns).toContain('completedAt');
    expect(columns).toContain('failedAt');
  });
});

describe('songStatusEnum', () => {
  it('exports songStatusEnum', async () => {
    const schema = await import('./schema');
    expect(schema.songStatusEnum).toBeDefined();
  });

  it('songStatusEnum has correct values', async () => {
    const { songStatusEnum } = await import('./schema');
    const enumValues = songStatusEnum.enumValues;
    expect(enumValues).toContain('generating');
    expect(enumValues).toContain('completed');
    expect(enumValues).toContain('failed');
    expect(enumValues).toHaveLength(3);
  });
});

describe('old exports removed', () => {
  it('does NOT export generations', async () => {
    const schema = await import('./schema');
    expect((schema as Record<string, unknown>).generations).toBeUndefined();
  });

  it('does NOT export outputs', async () => {
    const schema = await import('./schema');
    expect((schema as Record<string, unknown>).outputs).toBeUndefined();
  });

  it('does NOT export generationStatusEnum', async () => {
    const schema = await import('./schema');
    expect((schema as Record<string, unknown>).generationStatusEnum).toBeUndefined();
  });

  it('does NOT export generationsRelations', async () => {
    const schema = await import('./schema');
    expect((schema as Record<string, unknown>).generationsRelations).toBeUndefined();
  });

  it('does NOT export outputsRelations', async () => {
    const schema = await import('./schema');
    expect((schema as Record<string, unknown>).outputsRelations).toBeUndefined();
  });
});

// ─── R2 key helpers ──────────────────────────────────────────────────────────

describe('buildSongR2WavKey', () => {
  it('returns songs/{songId}/audio.wav format', async () => {
    const { buildSongR2WavKey } = await import('../lib/r2');
    expect(buildSongR2WavKey('abc-123')).toBe('songs/abc-123/audio.wav');
  });

  it('uses the provided songId in the path', async () => {
    const { buildSongR2WavKey } = await import('../lib/r2');
    const id = 'd4f2a8b1-3e9c-4a1b-b2c3-d5e6f7a8b9c0';
    expect(buildSongR2WavKey(id)).toBe(`songs/${id}/audio.wav`);
  });
});

describe('buildSongR2Mp3Key', () => {
  it('returns songs/{songId}/audio.mp3 format', async () => {
    const { buildSongR2Mp3Key } = await import('../lib/r2');
    expect(buildSongR2Mp3Key('abc-123')).toBe('songs/abc-123/audio.mp3');
  });

  it('uses the provided songId in the path', async () => {
    const { buildSongR2Mp3Key } = await import('../lib/r2');
    const id = 'd4f2a8b1-3e9c-4a1b-b2c3-d5e6f7a8b9c0';
    expect(buildSongR2Mp3Key(id)).toBe(`songs/${id}/audio.mp3`);
  });
});
