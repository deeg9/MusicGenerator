const PRESET_GENRES = [
  'Happy',
  'Sad',
  'Chill',
  'Energetic',
  'Romantic',
  'Pop',
  'Rock',
  'Jazz',
  'Hip-Hop',
  'Electronic',
] as const;

interface GenreChipsProps {
  selectedGenres: string[];
  customText: string;
  onToggleGenre: (genre: string) => void;
  onCustomTextChange: (text: string) => void;
}

export function GenreChips({
  selectedGenres,
  customText,
  onToggleGenre,
  onCustomTextChange,
}: GenreChipsProps) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-2">Genre &amp; Style</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESET_GENRES.map((genre) => {
          const isSelected = selectedGenres.includes(genre);
          return (
            <button
              key={genre}
              type="button"
              onClick={() => onToggleGenre(genre)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-card-foreground hover:bg-muted'
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={customText}
        onChange={(e) => onCustomTextChange(e.target.value)}
        placeholder="Add custom tags..."
        className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}
