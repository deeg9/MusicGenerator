import { z } from 'zod';
import type { QuizData } from '@/lib/quiz-types';

// ─── Validation schema ────────────────────────────────────────────────────────

export const step6Schema = z.object({
  language: z.string().min(1),
  emailOptIn: z.boolean(),
  email: z.string().email('Please enter a valid email').or(z.literal('')),
}).refine(
  (data) => !data.emailOptIn || data.email.length > 0,
  { message: 'Please enter your email address', path: ['email'] },
);

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

      {/* Email opt-in checkbox + conditional email input */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.emailOptIn}
            onChange={(e) => {
              const checked = e.target.checked;
              updateData({
                emailOptIn: checked,
                ...(!checked ? { email: '' } : {}),
              });
            }}
            className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm font-medium text-foreground">
            Email me when my song is ready
          </span>
        </label>

        {data.emailOptIn && (
          <div className="mt-3">
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
        )}
      </div>
    </div>
  );
}
