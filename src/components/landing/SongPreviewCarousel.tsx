'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';

interface SampleSong {
  id: string;
  title: string;
  genre: string;
  emoji: string;
  gradient: string;
  image?: string;
  audioSrc?: string;
}

const AUDIO_SRC_DEFAULT = '/sample-song.mp3';

const SAMPLE_SONGS: SampleSong[] = [
  { id: '1', title: 'Happy Birthday, Mom', genre: 'Pop', emoji: '🎂', gradient: 'from-pink-300 to-rose-400', image: '/cover-mom.png', audioSrc: '/preview-mom.mp3' },
  { id: '2', title: 'For My Best Friend', genre: 'Folk / Acoustic', emoji: '🤝', gradient: 'from-amber-300 to-orange-400', image: '/cover-friend.png', audioSrc: '/preview-friend.mp3' },
  { id: '3', title: 'Our Love Story', genre: 'R&B / Soul', emoji: '💕', gradient: 'from-red-300 to-pink-400', image: '/cover-love.png', audioSrc: '/preview-love.mp3' },
  { id: '4', title: "Dad, You're My Hero", genre: 'Country', emoji: '🦸', gradient: 'from-sky-300 to-blue-400', image: '/cover-dad.png', audioSrc: '/preview-dad.mp3' },
  { id: '5', title: 'To My Daughter', genre: 'Classical', emoji: '🌸', gradient: 'from-purple-300 to-violet-400', image: '/cover-daughter.png', audioSrc: '/preview-daughter.mp3' },
];

export function SongPreviewCarousel() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [durationMap, setDurationMap] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  // Create audio elements on mount
  useEffect(() => {
    const map: Record<string, HTMLAudioElement> = {};
    SAMPLE_SONGS.forEach((song) => {
      const audio = new Audio(song.audioSrc ?? AUDIO_SRC_DEFAULT);
      audio.preload = 'metadata';
      map[song.id] = audio;
    });
    audioRefs.current = map;

    return () => {
      Object.values(map).forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  // Setup listeners
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    SAMPLE_SONGS.forEach((song) => {
      const audio = audioRefs.current[song.id];
      if (!audio) return;

      const onTimeUpdate = () => {
        setProgressMap((prev) => ({
          ...prev,
          [song.id]: (audio.currentTime / (audio.duration || 1)) * 100,
        }));
      };

      const onLoadedMetadata = () => {
        setDurationMap((prev) => ({ ...prev, [song.id]: audio.duration }));
      };

      const onEnded = () => {
        setPlayingId(null);
        setProgressMap((prev) => ({ ...prev, [song.id]: 0 }));
      };

      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('ended', onEnded);

      cleanups.push(() => {
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('ended', onEnded);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  const togglePlay = useCallback((id: string) => {
    const current = audioRefs.current[id];
    if (!current) return;

    // Stop any other playing audio
    if (playingId && playingId !== id) {
      const prev = audioRefs.current[playingId];
      if (prev) {
        prev.pause();
        prev.currentTime = 0;
      }
      setProgressMap((p) => ({ ...p, [playingId]: 0 }));
    }

    if (playingId === id && !current.paused) {
      current.pause();
      setPlayingId(null);
    } else {
      current.play();
      setPlayingId(id);
    }
  }, [playingId]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full">
      <p className="text-sm text-muted-foreground mb-2 font-medium text-center">Listen to songs others have created</p>
      <div className="flex overflow-x-auto gap-3 pb-2 justify-center" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {SAMPLE_SONGS.map((song) => {
          const progress = progressMap[song.id] || 0;
          const audio = audioRefs.current[song.id];
          const duration = durationMap[song.id] || 0;
          const currentTime = audio?.currentTime || 0;
          const isPlaying = playingId === song.id;
          const circumference = 2 * Math.PI * 18;

          return (
            <div
              key={song.id}
              className="flex-shrink-0 w-[150px] rounded-xl bg-white shadow-medium flex flex-col items-center p-3"
            >
              {/* Album art */}
              {song.image ? (
                <img
                  src={song.image}
                  alt={song.title}
                  className="w-full h-24 rounded-lg object-cover mb-2"
                />
              ) : (
                <div
                  className={`w-full h-24 rounded-lg bg-gradient-to-br ${song.gradient} flex items-center justify-center mb-2`}
                >
                  <span className="text-3xl">{song.emoji}</span>
                </div>
              )}

              {/* Title */}
              <h4 className="text-xs font-semibold text-foreground text-center mb-1 leading-tight line-clamp-2">
                {song.title}
              </h4>
              <span className="text-[10px] text-muted-foreground mb-2">{song.genre}</span>

              {/* Linear progress */}
              <div className="w-full h-1 bg-gray-200 rounded-full mb-1">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">
                {formatTime(currentTime)} / {duration ? formatTime(duration) : '0:00'}
              </p>

              {/* Play button with circular progress */}
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    stroke="#e5e7eb"
                    strokeWidth="2.5"
                    fill="none"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    stroke="#6ba3c9"
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (circumference * progress) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-200"
                  />
                </svg>
                <button
                  onClick={() => togglePlay(song.id)}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:border-primary transition-colors"
                  aria-label={isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 text-primary fill-primary" />
                  ) : (
                    <Play className="h-4 w-4 text-primary fill-primary ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
