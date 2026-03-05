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
        'rounded-xl border bg-card p-4 flex flex-col gap-4 transition-shadow shadow-subtle',
        isActive
          ? 'border-primary/30 shadow-medium ring-2 ring-primary/50 shadow-primary/10'
          : 'border-border',
      ].join(' ')}
    >
      {/* Label */}
      <p className="text-sm font-medium text-muted-foreground">Variant {variantIndex + 1}</p>

      {/* Waveform player or unavailable */}
      {audioUrl ? (
        <WaveformPlayer url={audioUrl} isActive={isActive} onPlay={onPlay} />
      ) : (
        <p className="text-sm italic text-muted-foreground">Audio unavailable</p>
      )}

      {/* Duration / size info */}
      {infoLine && (
        <p className="text-xs text-muted-foreground">{infoLine}</p>
      )}

      {/* Download buttons */}
      <div className="flex gap-2">
        {mp3Url && (
          <a
            href={mp3Url}
            download
            className="flex-1 rounded-lg bg-accent text-accent-foreground px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-accent/90"
          >
            Download MP3
          </a>
        )}
        {wavUrl && !mp3Url && (
          <a
            href={wavUrl}
            download
            className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary w-full"
          >
            Download
          </a>
        )}
      </div>
    </div>
  );
}
