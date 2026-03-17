import { useState } from 'react';
import { z } from 'zod';
import type { QuizData } from '@/lib/quiz-types';

// ─── Validation schema ────────────────────────────────────────────────────────

export const step5Schema = z.object({
  message: z.string().min(20, 'Please write at least 20 characters'),
});

// ─── Guiding questions ────────────────────────────────────────────────────────

const GUIDING_QUESTIONS = [
  'What do you want them to know?',
  "What have you always wanted to say?",
  'How do they make your life better?',
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Step5MessageProps {
  data: QuizData;
  errors: Record<string, string>;
  updateData: (fields: Partial<QuizData>) => void;
}

export function Step5Message({ data, errors, updateData }: Step5MessageProps) {
  const MAX = 500;
  const count = data.message.length;
  const [showRecipientEmail, setShowRecipientEmail] = useState(!!data.recipientEmail);

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
          value={data.message}
          onChange={(e) => updateData({ message: e.target.value })}
          placeholder="e.g. I don't say it enough, but you mean the world to me..."
          rows={5}
          maxLength={MAX}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="absolute bottom-3 right-3 text-xs text-muted-foreground pointer-events-none">
          {count}/{MAX}
        </span>
      </div>

      {/* Validation error */}
      {errors.message && (
        <p className="text-destructive text-sm" role="alert">
          {errors.message}
        </p>
      )}

      {/* Optional recipient email */}
      <div className="border-t border-border pt-4 mt-2">
        {!showRecipientEmail ? (
          <button
            type="button"
            onClick={() => setShowRecipientEmail(true)}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Want to email this song directly to them?
          </button>
        ) : (
          <div className="space-y-2">
            <label htmlFor="recipient-email-quiz" className="text-sm font-medium text-foreground">
              Recipient&apos;s email
            </label>
            <input
              id="recipient-email-quiz"
              type="email"
              value={data.recipientEmail}
              onChange={(e) => updateData({ recipientEmail: e.target.value })}
              placeholder="their@email.com"
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              We&apos;ll send them a gift notification when the song is ready
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
