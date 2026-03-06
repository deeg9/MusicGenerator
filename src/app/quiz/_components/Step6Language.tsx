import { z } from 'zod';
import type { QuizData } from '@/lib/quiz-types';

// ─── Validation schema ────────────────────────────────────────────────────────

export const step6Schema = z.object({
  language: z.string().min(1),
  email: z.string().email('Please enter a valid email').or(z.literal('')),
});

// ─── Language options ─────────────────────────────────────────────────────────

const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French', 'Portuguese', 'Mandarin'];

// ─── Component ────────────────────────────────────────────────────────────────

interface Step6LanguageProps {
  data: QuizData;
  errors: Record<string, string>;
  updateData: (fields: Partial<QuizData>) => void;
}

export function Step6Language({ data, errors, updateData }: Step6LanguageProps) {
  return (
    <div className="space-y-6">
      {/* Language selector */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Song language
        </label>
        <select
          value={data.language}
          onChange={(e) => updateData({ language: e.target.value })}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      {/* Optional email input */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Get notified about new features{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => updateData({ email: e.target.value })}
          placeholder="your@email.com"
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.email && (
          <p className="mt-2 text-destructive text-sm" role="alert">
            {errors.email}
          </p>
        )}
      </div>
    </div>
  );
}
