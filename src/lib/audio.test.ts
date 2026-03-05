import { describe, it, expect } from 'vitest';
import { convertWavToMp3 } from './audio';

describe('convertWavToMp3', () => {
  it('is exported as a function', () => {
    expect(typeof convertWavToMp3).toBe('function');
  });

  it.todo('converts WAV buffer to MP3 buffer');
  it.todo('produces 320kbps MP3');
  it.todo('cleans up temp files on success');
  it.todo('cleans up temp files on failure');
});
