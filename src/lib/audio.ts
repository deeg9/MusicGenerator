import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath = require('ffmpeg-static') as string;

const execFileAsync = promisify(execFile);

// ─────────────────────────────────────────────────────────────────────────────
// Format detection
// ─────────────────────────────────────────────────────────────────────────────

export type AudioFormat = 'wav' | 'mp3' | 'unknown';

/**
 * Detect audio format from buffer header bytes.
 * ACE-Step sometimes returns MP3 content with .wav file paths.
 */
export function detectAudioFormat(buffer: Buffer): AudioFormat {
  if (buffer.length < 4) return 'unknown';

  // WAV: starts with "RIFF"
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'wav';
  }

  // MP3 with ID3 tag: starts with "ID3"
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return 'mp3';
  }

  // MP3 frame sync: starts with 0xFF 0xFB, 0xFF 0xFA, or 0xFF 0xF3
  if (buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xfa || buffer[1] === 0xf3)) {
    return 'mp3';
  }

  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// Audio conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert an audio buffer to 320 kbps MP3 using ffmpeg-static.
 * Works with both WAV and MP3 input (re-encodes MP3 at higher bitrate).
 *
 * Uses temp files in os.tmpdir() — cleaned up on both success and failure.
 */
export async function convertToMp3(inputBuffer: Buffer): Promise<Buffer> {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const format = detectAudioFormat(inputBuffer);
  const inExt = format === 'wav' ? '.wav' : '.mp3';
  const tmpIn = path.join(os.tmpdir(), `music-gen-in-${uniqueSuffix}${inExt}`);
  const tmpOut = path.join(os.tmpdir(), `music-gen-out-${uniqueSuffix}.mp3`);

  try {
    await fs.writeFile(tmpIn, inputBuffer);

    await execFileAsync(ffmpegPath as string, [
      '-i', tmpIn,
      '-codec:a', 'libmp3lame',
      '-b:a', '320k',
      '-y',
      tmpOut,
    ]);

    const mp3Buffer = await fs.readFile(tmpOut);
    return mp3Buffer;
  } finally {
    // Always clean up temp files — swallow unlink errors
    await fs.unlink(tmpIn).catch(() => undefined);
    await fs.unlink(tmpOut).catch(() => undefined);
  }
}

/** @deprecated Use convertToMp3 instead */
export const convertWavToMp3 = convertToMp3;
