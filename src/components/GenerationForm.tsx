'use client';

import { useState } from 'react';
import { ModeToggle } from './ModeToggle';
import { GenreChips } from './GenreChips';
import { DurationPreset } from './DurationPreset';
import { LyricsTextarea } from './LyricsTextarea';

export interface GenerationFormData {
  prompt: string;
  lyrics?: string;
  genreTags?: string;
  duration: number;
  instrumental: boolean;
}

interface GenerationFormProps {
  onSubmit: (data: GenerationFormData) => void;
  isSubmitting: boolean;
}

export function GenerationForm({ onSubmit, isSubmitting }: GenerationFormProps) {
  const [mode, setMode] = useState<'simple' | 'custom'>('simple');
  const [prompt, setPrompt] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [customGenreText, setCustomGenreText] = useState('');
  const [duration, setDuration] = useState(120);
  const [instrumental, setInstrumental] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleToggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!prompt.trim()) {
      errs.prompt = 'Describe your song to get started.';
    }
    if (mode === 'custom' && lyrics.trim() && lyrics.length > 5000) {
      errs.lyrics = 'Lyrics must be under 5000 characters.';
    }
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});

    const customTags = customGenreText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const allTags = [...selectedGenres, ...customTags];
    const genreTags = allTags.length > 0 ? allTags.join(', ') : undefined;

    const data: GenerationFormData = {
      prompt,
      genreTags,
      duration,
      instrumental,
    };

    if (mode === 'custom' && lyrics.trim()) {
      data.lyrics = lyrics;
    }

    onSubmit(data);
  }

  const canSubmit = !isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Mode toggle */}
      <ModeToggle mode={mode} onChange={setMode} />

      {/* Prompt */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Describe your song</p>
        <input
          type="text"
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setErrors((prev) => { const { prompt: _p, ...rest } = prev; return rest; });
          }}
          placeholder="Describe the vibe of your song..."
          aria-invalid={!!errors.prompt}
          className={`w-full bg-card border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors ${
            errors.prompt ? 'border-destructive ring-destructive' : 'border-border'
          }`}
        />
        {errors.prompt && <p className="mt-1 text-xs text-destructive">{errors.prompt}</p>}
      </div>

      {/* Lyrics — always mounted, animated via CSS grid-template-rows */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: mode === 'custom' ? '1fr' : '0fr' }}
      >
        <div
          className="overflow-hidden transition-opacity duration-300"
          style={{ opacity: mode === 'custom' ? 1 : 0 }}
        >
          <LyricsTextarea
            lyrics={lyrics}
            onChange={(val) => {
              setLyrics(val);
              setErrors((prev) => { const { lyrics: _l, ...rest } = prev; return rest; });
            }}
          />
          {errors.lyrics && <p className="mt-1 text-xs text-destructive">{errors.lyrics}</p>}
        </div>
      </div>

      {/* Genre chips */}
      <GenreChips
        selectedGenres={selectedGenres}
        customText={customGenreText}
        onToggleGenre={handleToggleGenre}
        onCustomTextChange={setCustomGenreText}
      />

      {/* Duration */}
      <DurationPreset duration={duration} onChange={setDuration} />

      {/* Instrumental toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={instrumental}
          onChange={(e) => setInstrumental(e.target.checked)}
          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
        />
        <span className="text-sm font-medium text-foreground">Instrumental (no vocals)</span>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Generating...' : 'Generate Song'}
      </button>
    </form>
  );
}
