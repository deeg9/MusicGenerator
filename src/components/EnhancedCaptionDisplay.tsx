interface EnhancedCaptionDisplayProps {
  caption: string;
}

export function EnhancedCaptionDisplay({ caption }: EnhancedCaptionDisplayProps) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        AI-Enhanced Caption
      </p>
      <p className="text-sm text-foreground font-mono leading-relaxed">{caption}</p>
    </div>
  );
}
