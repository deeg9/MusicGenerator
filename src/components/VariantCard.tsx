'use client';

import { WaveformPlayer } from './WaveformPlayer';

interface VariantCardProps {
  variantIndex: number;
  playbackUrl: string | null;
  mp3Url: string | null;
  wavUrl: string | null;
  isActive: boolean;
  onPlay: () => void;
  mp3FileSizeBytes: number | null;
  duration: number | null;
  promptText: string | null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatMB(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function VariantCard({
  variantIndex,
  playbackUrl,
  mp3Url,
  wavUrl,
  isActive,
  onPlay,
  mp3FileSizeBytes,
  duration,
}: VariantCardProps) {
  const audioUrl = playbackUrl ?? mp3Url ?? wavUrl;
  const durationStr = formatDuration(duration);
  const sizeStr = formatMB(mp3FileSizeBytes);
  const infoLine = [durationStr, sizeStr ? `${sizeStr} MP3` : ''].filter(Boolean).join(' · ');

  return (
    <div
      className={[
        'rounded-xl border bg-zinc-900 p-4 flex flex-col gap-4 transition-shadow',
        isActive
          ? 'border-violet-500/50 shadow-lg shadow-violet-500/10 ring-2 ring-violet-500/50'
          : 'border-zinc-800',
      ].join(' ')}
    >
      {/* Label */}
      <p className="text-sm font-medium text-zinc-400">Variant {variantIndex + 1}</p>

      {/* Waveform player or unavailable */}
      {audioUrl ? (
        <WaveformPlayer url={audioUrl} isActive={isActive} onPlay={onPlay} />
      ) : (
        <p className="text-sm italic text-zinc-500">Audio unavailable</p>
      )}

      {/* Duration / size info */}
      {infoLine && (
        <p className="text-xs text-zinc-500">{infoLine}</p>
      )}

      {/* Download buttons */}
      <div className="flex gap-2">
        {mp3Url && (
          <a
            href={mp3Url}
            download
            className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            Download MP3
          </a>
        )}
        {wavUrl && !mp3Url && (
          <a
            href={wavUrl}
            download
            className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-center text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white w-full"
          >
            Download
          </a>
        )}
      </div>
    </div>
  );
}
