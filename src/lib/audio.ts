import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath = require('ffmpeg-static') as string;

const execFileAsync = promisify(execFile);

// ─────────────────────────────────────────────────────────────────────────────
// WAV-to-MP3 conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a WAV audio buffer to a 320 kbps MP3 buffer using ffmpeg-static.
 *
 * Uses temp files in os.tmpdir() — cleaned up on both success and failure.
 *
 * @param wavBuffer - Raw WAV file bytes
 * @returns MP3 file bytes at 320 kbps
 */
export async function convertWavToMp3(wavBuffer: Buffer): Promise<Buffer> {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tmpIn = path.join(os.tmpdir(), `music-gen-in-${uniqueSuffix}.wav`);
  const tmpOut = path.join(os.tmpdir(), `music-gen-out-${uniqueSuffix}.mp3`);

  try {
    await fs.writeFile(tmpIn, wavBuffer);

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
