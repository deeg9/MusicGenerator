'use client';

import type { ReactNode } from 'react';
import { SidebarProvider } from './SidebarProvider';
import { Sidebar } from './Sidebar';
import { AudioPlayerProvider, useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { BottomAudioPlayer } from './BottomAudioPlayer';

function ShellInner({ children }: { children: ReactNode }) {
  const { currentTrack } = useAudioPlayer();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: currentTrack ? 'var(--player-bar-height)' : undefined }}
      >
        {children}
      </main>
      <BottomAudioPlayer />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AudioPlayerProvider>
        <ShellInner>{children}</ShellInner>
      </AudioPlayerProvider>
    </SidebarProvider>
  );
}
