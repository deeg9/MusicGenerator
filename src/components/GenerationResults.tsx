'use client';

import { useGenerationStatus } from '@/hooks/useGenerationStatus';
import { VariantCard } from './VariantCard';
import { EnhancedCaptionDisplay } from './EnhancedCaptionDisplay';

interface GenerationResultsProps {
  jobId: string | null;
  enhancedCaption: string | null;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function GenerationResults({ jobId, enhancedCaption }: GenerationResultsProps) {
  const { data, isPolling, elapsedSeconds, error } = useGenerationStatus(jobId);

  if (!jobId) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Enhanced caption — always shown once available */}
      {enhancedCaption && <EnhancedCaptionDisplay caption={enhancedCaption} />}

      {/* Polling / loading state */}
      {isPolling && (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <span className="inline-block h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-sm text-zinc-300">
            Generating your song...{' '}
            <span className="text-zinc-500">{formatElapsed(elapsedSeconds)}</span>
          </span>
        </div>
      )}

      {/* Completed — show variant cards */}
      {!isPolling && data?.status === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.outputs.map((output) => (
            <VariantCard
              key={output.id}
              variantIndex={output.variantIndex}
              url={output.url}
            />
          ))}
        </div>
      )}

      {/* Failed — job error */}
      {!isPolling && data?.status === 'failed' && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3">
          <p className="text-sm text-red-300">
            {data.error?.message ?? 'Generation failed. Please try again.'}
          </p>
          {data.error?.retryable && (
            <p className="mt-1 text-sm text-red-400">You can try again.</p>
          )}
        </div>
      )}

      {/* Hook error — network / non-ok response */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
