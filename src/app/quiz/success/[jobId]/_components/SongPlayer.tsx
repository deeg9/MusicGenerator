'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
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
  const isDragging = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewEnded, setPreviewEnded] = useState(false);
  const [dragging, setDragging] = useState(false);

  // In preview mode: cap display to PREVIEW_LIMIT_S
  const displayDuration = isPreview ? PREVIEW_LIMIT_S : duration;

  /** Calculate time from a clientX position relative to the progress bar */
  const getTimeFromX = useCallback((clientX: number): number | null => {
    const bar = progressRef.current;
    if (!bar || !displayDuration) return null;
    const rect = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return fraction * displayDuration;
  }, [displayDuration]);

  /** Seek audio to a given time */
  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (isDragging.current) return;
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
        audio.currentTime = 0;
        setCurrentTime(0);
        setPreviewEnded(false);
      }
      void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }

  /** Start drag from mouse or touch */
  function handleDragStart(clientX: number) {
    isDragging.current = true;
    setDragging(true);
    const time = getTimeFromX(clientX);
    if (time !== null) seekTo(time);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    handleDragStart(e.clientX);

    const handleMouseMove = (ev: MouseEvent) => {
      const time = getTimeFromX(ev.clientX);
      if (time !== null) seekTo(time);
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      setDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const touch = e.touches[0];
    if (!touch) return;
    handleDragStart(touch.clientX);

    const handleTouchMove = (ev: TouchEvent) => {
      const t = ev.touches[0];
      if (!t) return;
      const time = getTimeFromX(t.clientX);
      if (time !== null) seekTo(time);
    };
    const handleTouchEnd = () => {
      isDragging.current = false;
      setDragging(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  }

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
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="group relative w-full py-2 cursor-pointer"
            role="slider"
            aria-valuenow={Math.round(currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(displayDuration)}
            aria-label="Seek"
            tabIndex={0}
          >
            <div className="relative w-full h-2 bg-muted rounded-full">
              <div
                className={`h-full bg-primary rounded-full ${dragging ? '' : 'transition-all duration-100'}`}
                style={{ width: `${progressPercent}%` }}
              />
              {/* Drag thumb */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary shadow-md transition-opacity ${dragging ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'}`}
                style={{ left: `${progressPercent}%` }}
              />
            </div>
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
