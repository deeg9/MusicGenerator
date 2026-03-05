interface EnhancedCaptionDisplayProps {
  caption: string;
}

export function EnhancedCaptionDisplay({ caption }: EnhancedCaptionDisplayProps) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        AI-Enhanced Caption
      </p>
      <p className="text-sm text-zinc-300 font-mono leading-relaxed">{caption}</p>
    </div>
  );
}
