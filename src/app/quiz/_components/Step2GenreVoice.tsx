import { z } from 'zod';
import type { QuizData, VoicePreference } from '@/lib/quiz-types';
import { SelectionCard } from './SelectionCard';
import { PillButton } from './PillButton';

// ─── Validation schema ────────────────────────────────────────────────────────

export const step2Schema = z.object({
  genre: z.string().min(1, 'Please select a music genre'),
});

// ─── Genre options ────────────────────────────────────────────────────────────

const GENRE_OPTIONS: { id: string; label: string; mood: string }[] = [
  { id: 'Pop', label: 'Pop', mood: 'Upbeat and fun' },
  { id: 'R&B / Soul', label: 'R&B / Soul', mood: 'Smooth and heartfelt' },
  { id: 'Folk / Acoustic', label: 'Folk / Acoustic', mood: 'Warm and intimate' },
  { id: 'Rock', label: 'Rock', mood: 'Bold and energetic' },
  { id: 'Hip-Hop', label: 'Hip-Hop', mood: 'Rhythmic and expressive' },
  { id: 'Classical', label: 'Classical', mood: 'Elegant and timeless' },
  { id: 'Country', label: 'Country', mood: 'Storytelling and soulful' },
];

// ─── Voice preference options ─────────────────────────────────────────────────

const VOICE_OPTIONS: VoicePreference[] = ['Male', 'Female', 'No Preference'];

// ─── Component ────────────────────────────────────────────────────────────────

interface Step2GenreVoiceProps {
  data: QuizData;
  errors: Record<string, string>;
  updateData: (fields: Partial<QuizData>) => void;
}

export function Step2GenreVoice({ data, errors, updateData }: Step2GenreVoiceProps) {
  return (
    <div className="space-y-6">
      {/* Genre selection */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {GENRE_OPTIONS.map((genre) => (
            <SelectionCard
              key={genre.id}
              label={genre.label}
              subLabel={genre.mood}
              selected={data.genre === genre.id}
              onSelect={() => updateData({ genre: genre.id })}
            />
          ))}
        </div>
        {errors.genre && (
          <p className="mt-2 text-destructive text-sm" role="alert">
            {errors.genre}
          </p>
        )}
      </div>

      {/* Voice preference */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">Voice preference</p>
        <div className="flex flex-wrap gap-2">
          {VOICE_OPTIONS.map((voice) => (
            <PillButton
              key={voice}
              label={voice}
              selected={data.voicePreference === voice}
              onSelect={() => updateData({ voicePreference: voice })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
