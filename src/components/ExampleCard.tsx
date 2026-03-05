'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { WaveformPlayer } from './WaveformPlayer';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ExampleCardProps {
  title: string;
  genre: string;
  audioUrl: string;
}

export function ExampleCard({ title, genre, audioUrl }: ExampleCardProps) {
  const [resolvedUrl, setResolvedUrl] = useState(audioUrl);
  const audioPlayer = useAudioPlayer();

  useEffect(() => {
    let cancelled = false;

    fetch(audioUrl)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { url: string }) => {
        if (!cancelled && data.url) {
          setResolvedUrl(data.url);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  const reducedMotion = useReducedMotion();
  const isNowPlaying = audioPlayer.currentTrack?.url === resolvedUrl && audioPlayer.isPlaying;

  const handleRequestPlay = useCallback(() => {
    audioPlayer.play({
      url: resolvedUrl,
      title,
    });
  }, [audioPlayer, resolvedUrl, title]);

  return (
    <motion.div
      whileHover={reducedMotion ? undefined : { y: -2, boxShadow: '0 10px 15px -3px oklch(0 0 0 / 0.10), 0 4px 6px -4px oklch(0 0 0 / 0.10)' }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={[
        'rounded-xl border bg-card p-4 flex flex-col gap-3',
        isNowPlaying ? 'border-primary/30 ring-2 ring-primary/50' : 'border-border',
      ].join(' ')}
    >
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{genre}</p>
      </div>
      <WaveformPlayer
        url={resolvedUrl}
        isActive={false}
        onPlay={() => {}}
        mode="visual-only"
        onRequestPlay={handleRequestPlay}
      />
    </motion.div>
  );
}
