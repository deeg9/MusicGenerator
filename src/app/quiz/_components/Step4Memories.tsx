import { z } from 'zod';
import type { QuizData } from '@/lib/quiz-types';

// ─── Validation schema ────────────────────────────────────────────────────────

export const step4Schema = z.object({
  memories: z.string().min(20, 'Please write at least 20 characters'),
});

// ─── Guiding questions ────────────────────────────────────────────────────────

const GUIDING_QUESTIONS = [
  "What's your favorite memory together?",
  'Is there a moment that always makes you smile?',
  "What's something only you two would understand?",
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Step4MemoriesProps {
  data: QuizData;
  errors: Record<string, string>;
  updateData: (fields: Partial<QuizData>) => void;
}

export function Step4Memories({ data, errors, updateData }: Step4MemoriesProps) {
  const MAX = 500;
  const count = data.memories.length;

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
          value={data.memories}
          onChange={(e) => updateData({ memories: e.target.value })}
          placeholder="e.g. That time we got lost driving to the beach and ended up at the best little diner..."
          rows={5}
          maxLength={MAX}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="absolute bottom-3 right-3 text-xs text-muted-foreground pointer-events-none">
          {count}/{MAX}
        </span>
      </div>

      {/* Validation error */}
      {errors.memories && (
        <p className="text-destructive text-sm" role="alert">
          {errors.memories}
        </p>
      )}
    </div>
  );
}
