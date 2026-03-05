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

  function handleToggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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

  const canSubmit = prompt.trim().length > 0 && !isSubmitting;

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
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the vibe of your song..."
          className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Lyrics — Custom mode only */}
      {mode === 'custom' && (
        <LyricsTextarea lyrics={lyrics} onChange={setLyrics} />
      )}

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
