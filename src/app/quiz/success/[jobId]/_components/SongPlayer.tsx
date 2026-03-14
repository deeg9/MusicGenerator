'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const PREVIEW_LIMIT_S = 30;

interface SongPlayerProps {
  src: string;
  isPreview?: boolean;
  onPreviewEnd?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SongPlayer({ src, isPreview = false, onPreviewEnd }: SongPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewEnded, setPreviewEnded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (isPreview && audio.currentTime >= PREVIEW_LIMIT_S) {
        audio.pause();
        audio.currentTime = PREVIEW_LIMIT_S;
        setCurrentTime(PREVIEW_LIMIT_S);
        setIsPlaying(false);
        setPreviewEnded(true);
        onPreviewEnd?.();
      } else {
        setCurrentTime(audio.currentTime);
      }
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleCanPlay = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [isPreview, onPreviewEnd]);

  function handlePlayPause() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (previewEnded) {
        // Allow replay of the 30s preview from the beginning
        audio.currentTime = 0;
        setCurrentTime(0);
        setPreviewEnded(false);
      }
      void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;

    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));

    if (isPreview) {
      audio.currentTime = Math.min(fraction * duration, PREVIEW_LIMIT_S);
    } else {
      audio.currentTime = fraction * duration;
    }
    setCurrentTime(audio.currentTime);
  }

  // In preview mode: cap display to PREVIEW_LIMIT_S
  const displayDuration = isPreview ? PREVIEW_LIMIT_S : duration;
  const progressPercent = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;

  return (
    <div className="relative w-full">
      <div className="w-full bg-card rounded-2xl shadow-sm border border-border p-6 flex flex-col items-center gap-5">
        {/* Hidden native audio element — no autoplay */}
        <audio ref={audioRef} src={src} preload="metadata" />

        {/* Play / Pause button */}
        <button
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 fill-current" />
          ) : (
            <Play className="w-7 h-7 fill-current ml-0.5" />
          )}
        </button>

        {/* Progress bar */}
        <div className="w-full flex flex-col gap-1.5">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="w-full h-2 bg-muted rounded-full cursor-pointer overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Time display */}
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(displayDuration)}</span>
          </div>
        </div>
      </div>

      {/* Gradient fade overlay when preview has ended */}
      {isPreview && previewEnded && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-background/90 via-background/40 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
