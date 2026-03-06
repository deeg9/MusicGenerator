import { z } from 'zod';
import type { QuizData } from '@/lib/quiz-types';

// ─── Validation schema ────────────────────────────────────────────────────────

export const step3Schema = z.object({
  qualities: z.string().min(20, 'Please write at least 20 characters'),
});

// ─── Guiding questions ────────────────────────────────────────────────────────

const GUIDING_QUESTIONS = [
  'What are 3 words that describe them?',
  'What do they love doing?',
  'What makes them unlike anyone else?',
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Step3QualitiesProps {
  data: QuizData;
  errors: Record<string, string>;
  updateData: (fields: Partial<QuizData>) => void;
}

export function Step3Qualities({ data, errors, updateData }: Step3QualitiesProps) {
  const MAX = 500;
  const count = data.qualities.length;

  return (
    <div className="space-y-4">
      {/* Guiding questions */}
      <ul className="space-y-1">
        {GUIDING_QUESTIONS.map((q) => (
          <li key={q} className="text-sm text-muted-foreground">
            {q}
          </li>
        ))}
      </ul>

      {/* Textarea with character counter */}
      <div className="relative">
        <textarea
          value={data.qualities}
          onChange={(e) => updateData({ qualities: e.target.value })}
          placeholder="e.g. Kind, patient, always knows how to make me laugh..."
          rows={5}
          maxLength={MAX}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="absolute bottom-3 right-3 text-xs text-muted-foreground pointer-events-none">
          {count}/{MAX}
        </span>
      </div>

      {/* Validation error */}
      {errors.qualities && (
        <p className="text-destructive text-sm" role="alert">
          {errors.qualities}
        </p>
      )}
    </div>
  );
}
