'use client';

import { motion } from 'framer-motion';
import { useGenerationStatus } from '@/hooks/useGenerationStatus';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { VariantCard } from './VariantCard';
import { EnhancedCaptionDisplay } from './EnhancedCaptionDisplay';

interface GenerationResultsProps {
  jobId: string | null;
  enhancedCaption: string | null;
}

export function GenerationResults({ jobId, enhancedCaption }: GenerationResultsProps) {
  const { data } = useGenerationStatus(jobId);
  const reducedMotion = useReducedMotion();

  if (!jobId || data?.status !== 'completed') return null;

  return (
    <div className="flex flex-col gap-4">
      {enhancedCaption && <EnhancedCaptionDisplay caption={enhancedCaption} />}

      <motion.div
        className="grid grid-cols-1 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: reducedMotion ? 0 : 0.1 } },
        }}
      >
        {data.outputs.map((output) => (
          <motion.div
            key={output.id}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
          >
          <VariantCard
            variantIndex={output.variantIndex}
            playbackUrl={output.playbackUrl}
            mp3Url={output.mp3Url}
            wavUrl={output.url}
            mp3FileSizeBytes={output.mp3FileSizeBytes}
            duration={output.duration}
            promptText={output.promptText}
          />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
