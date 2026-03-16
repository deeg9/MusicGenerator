'use client';

import { useEffect, useRef } from 'react';
import { trackListenPageOpened, trackSongPlayed, trackSongPlayCompleted } from '@/lib/analytics';

interface ListenPlayerProps {
  src: string;
  songId: string;
}

export function ListenPlayer({ src, songId }: ListenPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasTrackedPlay = useRef(false);

  // Track listen page opened on mount
  useEffect(() => {
    if (songId) {
      trackListenPageOpened(songId);
    }
  }, [songId]);

  function handlePlay() {
    if (!hasTrackedPlay.current && songId) {
      hasTrackedPlay.current = true;
      trackSongPlayed(songId, 'listen_page');
    }
  }

  function handleEnded() {
    if (songId) {
      trackSongPlayCompleted(songId, 'listen_page');
      hasTrackedPlay.current = false;
    }
  }

  return (
    <audio
      ref={audioRef}
      src={src}
      controls
      onPlay={handlePlay}
      onEnded={handleEnded}
      className="w-full rounded-lg"
      style={{ colorScheme: 'light' }}
    />
  );
}
