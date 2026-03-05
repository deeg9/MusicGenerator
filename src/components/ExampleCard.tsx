'use client';

// Stub component — implementation will be added in Phase 04 Plan 03

interface ExampleCardProps {
  title: string;
  genre: string;
  audioUrl: string;
  isActive: boolean;
  onPlay: () => void;
}

export function ExampleCard({ title, genre, audioUrl, isActive, onPlay }: ExampleCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-card-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{genre}</p>
        </div>
        <button
          onClick={onPlay}
          aria-label={isActive ? 'Pause' : 'Play'}
          className="rounded-full bg-primary p-2 text-primary-foreground"
        >
          {isActive ? '⏸' : '▶'}
        </button>
      </div>
    </div>
  );
}
