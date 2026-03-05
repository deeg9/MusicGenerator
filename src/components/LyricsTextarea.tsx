interface LyricsTextareaProps {
  lyrics: string;
  onChange: (lyrics: string) => void;
}

export function LyricsTextarea({ lyrics, onChange }: LyricsTextareaProps) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-2">Lyrics</p>
      <textarea
        rows={8}
        value={lyrics}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          '[Verse]\nYour verse lyrics here...\n\n[Chorus]\nYour chorus lyrics here...\n\n[Bridge]\nOptional bridge...'
        }
        className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono resize-y placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <p className="mt-1.5 text-xs text-muted-foreground">
        Use [Verse], [Chorus], [Bridge] tags to structure your lyrics
      </p>
    </div>
  );
}
