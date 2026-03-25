import { z } from 'zod';
import type { QuizData, VoicePreference } from '@/lib/quiz-types';
import { GENRE_OPTIONS } from '@/lib/genres';
import { SelectionCard } from './SelectionCard';
import { PillButton } from './PillButton';

// ─── Validation schema ────────────────────────────────────────────────────────

export const step2Schema = z.object({
  genre: z.string().min(1, 'Please select a music genre'),
});

// ─── Options ──────────────────────────────────────────────────────────────────

const VOICE_OPTIONS: VoicePreference[] = ['Male', 'Female', 'Duet', 'Choir', 'No Preference'];

const ENERGY_OPTIONS: { label: string; value: 'low' | 'medium' | 'high' }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

      {/* Voice preference — dimmed when instrumental is on */}
      <div className={data.instrumental ? 'opacity-50 pointer-events-none' : ''}>
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

      {/* Energy level */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">Energy level</p>
        <div className="flex flex-wrap gap-2">
          {ENERGY_OPTIONS.map(({ label, value }) => (
            <PillButton
              key={value}
              label={label}
              selected={data.energy === value}
              onSelect={() => updateData({ energy: data.energy === value ? '' : value })}
            />
          ))}
        </div>
      </div>

      {/* Instrumental toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Instrumental only (no vocals)</span>
        <button
          type="button"
          role="switch"
          aria-checked={data.instrumental}
          onClick={() => updateData({ instrumental: !data.instrumental })}
          className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            data.instrumental ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              data.instrumental ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
