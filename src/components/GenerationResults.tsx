'use client';

import { useState, useEffect } from 'react';
import { useGenerationStatus } from '@/hooks/useGenerationStatus';
import { VariantCard } from './VariantCard';
import { EnhancedCaptionDisplay } from './EnhancedCaptionDisplay';

interface GenerationResultsProps {
  jobId: string | null;
  enhancedCaption: string | null;
}

export function GenerationResults({ jobId, enhancedCaption }: GenerationResultsProps) {
  const { data } = useGenerationStatus(jobId);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  // Reset active variant when jobId changes (new generation)
  useEffect(() => {
    setActiveVariantId(null);
  }, [jobId]);

  if (!jobId || data?.status !== 'completed') return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Enhanced caption — always shown once available */}
      {enhancedCaption && <EnhancedCaptionDisplay caption={enhancedCaption} />}

      {/* Completed — show variant cards */}
      <div className="grid grid-cols-1 gap-4">
        {data.outputs.map((output) => (
          <VariantCard
            key={output.id}
            variantIndex={output.variantIndex}
            playbackUrl={output.playbackUrl}
            mp3Url={output.mp3Url}
            wavUrl={output.url}
            isActive={activeVariantId === output.id}
            onPlay={() => setActiveVariantId(output.id)}
            mp3FileSizeBytes={output.mp3FileSizeBytes}
            duration={output.duration}
            promptText={output.promptText}
          />
        ))}
      </div>
    </div>
  );
}
