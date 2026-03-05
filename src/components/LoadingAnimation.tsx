'use client';

import { TextShimmer } from './ui/text-shimmer';

export const STAGE_LABELS = ['Initializing', 'Generating', 'Finalizing'];
export const STAGE_DURATIONS = [1500, 4000, Infinity];

// Staggered animation delays for 7 equalizer bars
const BAR_DELAYS = ['0ms', '150ms', '300ms', '200ms', '80ms', '250ms', '120ms'];

interface LoadingAnimationProps {
  stageIndex: number;
  elapsedSeconds?: number;
  showElapsed?: boolean;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function LoadingAnimation({ stageIndex, elapsedSeconds, showElapsed }: LoadingAnimationProps) {
  const label = STAGE_LABELS[stageIndex] ?? STAGE_LABELS[0];

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      {/* Equalizer bars */}
      <div className="flex items-end gap-1.5 h-16">
        {BAR_DELAYS.map((delay, i) => (
          <div
            key={i}
            className="animate-eq-bar w-2 rounded-full bg-gradient-to-t from-violet-600 to-violet-400 origin-bottom"
            style={{ height: '100%', animationDelay: delay }}
          />
        ))}
      </div>

      {/* Stage label with shimmer effect */}
      <TextShimmer className="text-sm font-medium" duration={1.5}>
        {label}
      </TextShimmer>

      {/* Optional elapsed time */}
      {showElapsed && elapsedSeconds !== undefined && elapsedSeconds > 0 && (
        <span className="text-xs text-muted-foreground">{formatElapsed(elapsedSeconds)}</span>
      )}
    </div>
  );
}
