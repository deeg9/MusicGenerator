'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useWavesurfer } from '@wavesurfer/react';
import { useTheme } from 'next-themes';
import { Play, Pause, Volume2, VolumeX, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { getCssColorAsHex } from '@/lib/colors';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PlayerContent() {
  const { currentTrack, isPlaying, pause, resume, stop } = useAudioPlayer();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const { resolvedTheme } = useTheme();
  const prevUrlRef = useRef<string | null>(null);

  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    url: currentTrack?.url,
    waveColor: '#888',
    progressColor: '#0ea5e9',
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    height: 40,
    interact: true,
    normalize: true,
    fillParent: true,
  });

  // Wire wavesurfer events
  useEffect(() => {
    if (!wavesurfer) return;

    const onReady = () => {
      setIsReady(true);
      setDuration(wavesurfer.getDuration());
      wavesurfer.setVolume(isMuted ? 0 : volume);
      wavesurfer.play();
    };
    const onTimeUpdate = () => setCurrentTime(wavesurfer.getCurrentTime());
    const onFinish = () => {
      setCurrentTime(0);
      pause();
    };

    wavesurfer.on('ready', onReady);
    wavesurfer.on('timeupdate', onTimeUpdate);
    wavesurfer.on('finish', onFinish);

    return () => {
      wavesurfer.un('ready', onReady);
      wavesurfer.un('timeupdate', onTimeUpdate);
      wavesurfer.un('finish', onFinish);
    };
  }, [wavesurfer, volume, isMuted, pause]);

  // Theme sync
  useEffect(() => {
    if (!wavesurfer || !containerRef.current) return;
    const el = containerRef.current;
    wavesurfer.setOptions({
      waveColor: getCssColorAsHex('--muted', el),
      progressColor: getCssColorAsHex('--primary', el),
    });
  }, [wavesurfer, resolvedTheme]);

  // Sync play/pause state from context
  useEffect(() => {
    if (!wavesurfer || !isReady) return;
    if (isPlaying && !wavesurfer.isPlaying()) {
      wavesurfer.play();
    } else if (!isPlaying && wavesurfer.isPlaying()) {
      wavesurfer.pause();
    }
  }, [wavesurfer, isPlaying, isReady]);

  // Reset ready state when track URL changes
  useEffect(() => {
    if (currentTrack?.url !== prevUrlRef.current) {
      setIsReady(false);
      setCurrentTime(0);
      setDuration(0);
      prevUrlRef.current = currentTrack?.url ?? null;
    }
  }, [currentTrack?.url]);

  // Volume sync
  useEffect(() => {
    if (!wavesurfer) return;
    wavesurfer.setVolume(isMuted ? 0 : volume);
  }, [wavesurfer, volume, isMuted]);

  const toggleMute = () => setIsMuted((m) => !m);
  const togglePlayPause = () => (isPlaying ? pause() : resume());

  const downloadUrl = currentTrack?.mp3Url ?? currentTrack?.wavUrl ?? currentTrack?.url;

  return (
    <>
      {/* Desktop layout */}
      <div className="hidden h-full md:flex items-center gap-4 px-4">
        {/* Track info */}
        <div className="flex flex-col min-w-0 w-48 flex-shrink-0">
          <p className="text-sm font-medium text-foreground truncate">{currentTrack?.title}</p>
          {currentTrack?.variantIndex != null && (
            <p className="text-xs text-muted-foreground">Variant {currentTrack.variantIndex + 1}</p>
          )}
        </div>

        {/* Play/Pause */}
        <button
          onClick={togglePlayPause}
          disabled={!isReady}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
        </button>

        {/* Time */}
        <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">{formatTime(currentTime)}</span>

        {/* Waveform */}
        <div className="flex-1 min-w-0">
          <div ref={containerRef} className={isReady ? '' : 'opacity-0'} />
          {!isReady && <div className="h-10 w-full animate-pulse rounded bg-muted" />}
        </div>

        {/* Duration */}
        <span className="text-xs text-muted-foreground w-10 flex-shrink-0">{formatTime(duration)}</span>

        {/* Volume */}
        <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground transition-colors" aria-label={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={isMuted ? 0 : volume}
          onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
          className="w-20 accent-primary"
          aria-label="Volume"
        />

        {/* Download */}
        {downloadUrl && (
          <a href={downloadUrl} download className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Download">
            <Download className="h-4 w-4" />
          </a>
        )}

        {/* Close */}
        <button onClick={stop} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close player">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile layout */}
      <div className="flex h-full md:hidden items-center gap-3 px-3">
        <button
          onClick={togglePlayPause}
          disabled={!isReady}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-0.5" />}
        </button>

        <div className="flex flex-col flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{currentTrack?.title}</p>
          {/* Thin progress bar for mobile */}
          <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
        </div>

        <button onClick={stop} className="text-muted-foreground hover:text-foreground" aria-label="Close player">
          <X className="h-4 w-4" />
        </button>

        {/* Hidden wavesurfer container for mobile (audio engine) */}
        <div className="hidden">
          <div ref={containerRef} />
        </div>
      </div>
    </>
  );
}

export function BottomAudioPlayer() {
  const { currentTrack } = useAudioPlayer();

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-50 h-[var(--player-bar-height)] border-t border-border bg-card/95 backdrop-blur-sm"
        >
          <PlayerContent />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
