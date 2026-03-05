import { describe, it } from 'vitest';

describe('GET /api/status/[jobId]', () => {
  it.todo('returns mp3Url and url (WAV) for completed generation');
  it.todo('returns mp3FileSizeBytes for each output');
  it.todo('handles MP3 conversion failure gracefully (WAV-only fallback)');
});
