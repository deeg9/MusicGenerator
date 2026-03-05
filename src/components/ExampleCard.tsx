'use client';

import { useEffect, useState } from 'react';
import { WaveformPlayer } from './WaveformPlayer';

interface ExampleCardProps {
  title: string;
  genre: string;
  audioUrl: string;
  isActive: boolean;
  onPlay: () => void;
}

export function ExampleCard({ title, genre, audioUrl, isActive, onPlay }: ExampleCardProps) {
  // audioUrl is an API endpoint (e.g. "/api/examples/jazz-birthday") that returns
  // { url: string } — a presigned R2 URL. We fetch it once and pass the real URL to
  // WaveformPlayer. Until resolved we render the player in a disabled/loading state.
  const [resolvedUrl, setResolvedUrl] = useState(audioUrl);

  useEffect(() => {
    let cancelled = false;

    fetch(audioUrl)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { url: string }) => {
        if (!cancelled && data.url) {
          setResolvedUrl(data.url);
        }
      })
      .catch(() => {
        // WaveformPlayer handles load errors gracefully — leave resolvedUrl as-is
      });

    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{genre}</p>
      </div>
      <WaveformPlayer url={resolvedUrl} isActive={isActive} onPlay={onPlay} />
    </div>
  );
}
