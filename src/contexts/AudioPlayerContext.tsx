'use client';

import { createContext, useContext, useReducer, type ReactNode } from 'react';

export interface AudioTrack {
  url: string;
  title: string;
  variantIndex?: number;
  jobId?: string;
  mp3Url?: string | null;
  wavUrl?: string | null;
}

interface AudioPlayerState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
}

type AudioPlayerAction =
  | { type: 'PLAY'; track: AudioTrack }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' };

function audioPlayerReducer(state: AudioPlayerState, action: AudioPlayerAction): AudioPlayerState {
  switch (action.type) {
    case 'PLAY':
      return { currentTrack: action.track, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'RESUME':
      return { ...state, isPlaying: true };
    case 'STOP':
      return { currentTrack: null, isPlaying: false };
    default:
      return state;
  }
}

interface AudioPlayerContextValue {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  play: (track: AudioTrack) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(audioPlayerReducer, {
    currentTrack: null,
    isPlaying: false,
  });

  const play = (track: AudioTrack) => dispatch({ type: 'PLAY', track });
  const pause = () => dispatch({ type: 'PAUSE' });
  const resume = () => dispatch({ type: 'RESUME' });
  const stop = () => dispatch({ type: 'STOP' });

  return (
    <AudioPlayerContext.Provider value={{ ...state, play, pause, resume, stop }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
