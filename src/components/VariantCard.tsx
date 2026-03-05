'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { WaveformPlayer } from './WaveformPlayer';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface VariantCardProps {
  variantIndex: number;
  playbackUrl: string | null;
  mp3Url: string | null;
  wavUrl: string | null;
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
  mp3FileSizeBytes,
  duration,
}: VariantCardProps) {
  const audioUrl = playbackUrl ?? mp3Url ?? wavUrl;
  const durationStr = formatDuration(duration);
  const sizeStr = formatMB(mp3FileSizeBytes);
  const infoLine = [durationStr, sizeStr ? `${sizeStr} MP3` : ''].filter(Boolean).join(' · ');
  const audioPlayer = useAudioPlayer();
  const reducedMotion = useReducedMotion();

  const isNowPlaying = audioPlayer.currentTrack?.url === audioUrl && audioPlayer.isPlaying;

  const handleRequestPlay = useCallback(() => {
    if (!audioUrl) return;
    audioPlayer.play({
      url: audioUrl,
      title: `Variant ${variantIndex + 1}`,
      variantIndex,
      mp3Url,
      wavUrl,
    });
  }, [audioUrl, audioPlayer, variantIndex, mp3Url, wavUrl]);

  return (
    <motion.div
      whileHover={reducedMotion ? undefined : { y: -2, boxShadow: '0 10px 15px -3px oklch(0 0 0 / 0.10), 0 4px 6px -4px oklch(0 0 0 / 0.10)' }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={[
        'rounded-xl border bg-card p-4 flex flex-col gap-4 transition-shadow shadow-subtle',
        isNowPlaying
          ? 'border-primary/30 shadow-medium ring-2 ring-primary/50 shadow-primary/10'
          : 'border-border',
      ].join(' ')}
    >
      {/* Label */}
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">Variant {variantIndex + 1}</p>
        {isNowPlaying && (
          <div className="flex items-center gap-0.5" aria-label="Now playing">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block w-0.5 bg-primary animate-eq-bar"
                style={{
                  height: '12px',
                  animationDelay: `${i * 0.15}s`,
                  transformOrigin: 'bottom',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Waveform player — visual-only, delegates play to bottom bar */}
      {audioUrl ? (
        <WaveformPlayer
          url={audioUrl}
          isActive={false}
          onPlay={() => {}}
          mode="visual-only"
          onRequestPlay={handleRequestPlay}
        />
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
    </motion.div>
  );
}
