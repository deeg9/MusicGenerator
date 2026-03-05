'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useWavesurfer } from '@wavesurfer/react';
import { useTheme } from 'next-themes';
import { Play, Pause } from 'lucide-react';
import { getCssColorAsHex } from '@/lib/colors';

interface WaveformPlayerProps {
  url: string;
  isActive: boolean;
  onPlay: () => void;
  mode?: 'interactive' | 'visual-only';
  onRequestPlay?: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function WaveformPlayer({ url, isActive, onPlay, mode = 'interactive', onRequestPlay }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { resolvedTheme } = useTheme();

  const isVisualOnly = mode === 'visual-only';

  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    url,
    waveColor: '#888',
    progressColor: '#0ea5e9',
    barWidth: 3,
    barGap: 1,
    barRadius: 2,
    height: 64,
    interact: !isVisualOnly,
    normalize: true,
    fillParent: true,
    ...(isVisualOnly ? { backend: 'WebAudio' as const, media: undefined } : {}),
  });

  // Wire up wavesurfer events
  useEffect(() => {
    if (!wavesurfer) return;

    const onReady = () => {
      setIsReady(true);
      setDuration(wavesurfer.getDuration());
      // Mute in visual-only mode to avoid double audio
      if (isVisualOnly) wavesurfer.setVolume(0);
    };

    const onPlayEvt = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(wavesurfer.getCurrentTime());
    const onError = () => {
      setHasError(true);
      setIsReady(true);
    };
    const onFinish = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    wavesurfer.on('ready', onReady);
    wavesurfer.on('play', onPlayEvt);
    wavesurfer.on('pause', onPause);
    wavesurfer.on('timeupdate', onTimeUpdate);
    wavesurfer.on('error', onError);
    wavesurfer.on('finish', onFinish);

    return () => {
      wavesurfer.un('ready', onReady);
      wavesurfer.un('play', onPlayEvt);
      wavesurfer.un('pause', onPause);
      wavesurfer.un('timeupdate', onTimeUpdate);
      wavesurfer.un('error', onError);
      wavesurfer.un('finish', onFinish);
    };
  }, [wavesurfer, isVisualOnly]);

  // Theme sync
  useEffect(() => {
    if (!wavesurfer || !containerRef.current) return;
    const el = containerRef.current;
    wavesurfer.setOptions({
      waveColor: getCssColorAsHex('--muted', el),
      progressColor: getCssColorAsHex('--primary', el),
    });
  }, [wavesurfer, resolvedTheme]);

  // Auto-pause when another variant becomes active (interactive mode only)
  useEffect(() => {
    if (!isActive && isPlaying && wavesurfer && !isVisualOnly) {
      wavesurfer.pause();
    }
  }, [isActive, isPlaying, wavesurfer, isVisualOnly]);

  const handlePlayPause = useCallback(() => {
    if (isVisualOnly) {
      onRequestPlay?.();
      return;
    }
    if (!wavesurfer || !isReady || hasError) return;
    if (!isPlaying) {
      onPlay();
    }
    wavesurfer.playPause();
  }, [wavesurfer, isReady, hasError, isPlaying, onPlay, isVisualOnly, onRequestPlay]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          disabled={!isReady || hasError}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPlaying && !isVisualOnly ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 translate-x-0.5" />
          )}
        </button>

        {/* Waveform container */}
        <div className="relative min-w-0 flex-1">
          {/* Loading placeholder */}
          {!isReady && (
            <div className="absolute inset-0 flex items-center">
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          )}
          <div ref={containerRef} className={isReady ? '' : 'opacity-0'} />
        </div>
      </div>

      {/* Time display */}
      <div className="flex justify-end text-xs text-muted-foreground">
        {hasError ? (
          <span className="text-destructive">Failed to load audio</span>
        ) : (
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        )}
      </div>
    </div>
  );
}
