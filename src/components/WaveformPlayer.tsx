'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useWavesurfer } from '@wavesurfer/react';
import { Play, Pause } from 'lucide-react';

interface WaveformPlayerProps {
  url: string;
  isActive: boolean;
  onPlay: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function WaveformPlayer({ url, isActive, onPlay }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    url,
    waveColor: '#3f3f46',
    progressColor: '#8b5cf6',
    barWidth: 3,
    barGap: 1,
    barRadius: 2,
    height: 64,
    interact: true,
    normalize: true,
    fillParent: true,
  });

  // Wire up wavesurfer events
  useEffect(() => {
    if (!wavesurfer) return;

    const onReady = () => {
      setIsReady(true);
      setDuration(wavesurfer.getDuration());
    };

    const onPlay = () => setIsPlaying(true);
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
    wavesurfer.on('play', onPlay);
    wavesurfer.on('pause', onPause);
    wavesurfer.on('timeupdate', onTimeUpdate);
    wavesurfer.on('error', onError);
    wavesurfer.on('finish', onFinish);

    return () => {
      wavesurfer.un('ready', onReady);
      wavesurfer.un('play', onPlay);
      wavesurfer.un('pause', onPause);
      wavesurfer.un('timeupdate', onTimeUpdate);
      wavesurfer.un('error', onError);
      wavesurfer.un('finish', onFinish);
    };
  }, [wavesurfer]);

  // Auto-pause when another variant becomes active
  useEffect(() => {
    if (!isActive && isPlaying && wavesurfer) {
      wavesurfer.pause();
    }
  }, [isActive, isPlaying, wavesurfer]);

  const handlePlayPause = useCallback(() => {
    if (!wavesurfer || !isReady || hasError) return;
    if (!isPlaying) {
      onPlay(); // Notify parent so other variants pause
    }
    wavesurfer.playPause();
  }, [wavesurfer, isReady, hasError, isPlaying, onPlay]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          disabled={!isReady || hasError}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPlaying ? (
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
              <div className="h-10 w-full animate-pulse rounded bg-zinc-800" />
            </div>
          )}
          <div ref={containerRef} className={isReady ? '' : 'opacity-0'} />
        </div>
      </div>

      {/* Time display */}
      <div className="flex justify-end text-xs text-zinc-500">
        {hasError ? (
          <span className="text-red-400">Failed to load audio</span>
        ) : (
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        )}
      </div>
    </div>
  );
}
