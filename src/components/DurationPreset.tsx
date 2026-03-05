const DURATION_PRESETS = [
  { label: 'Short (1 min)', seconds: 60 },
  { label: 'Standard (2 min)', seconds: 120 },
  { label: 'Full (4 min)', seconds: 240 },
] as const;

interface DurationPresetProps {
  duration: number;
  onChange: (seconds: number) => void;
}

export function DurationPreset({ duration, onChange }: DurationPresetProps) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-2">Duration</p>
      <div className="flex rounded-lg border border-border overflow-hidden">
        {DURATION_PRESETS.map((preset) => (
          <button
            key={preset.seconds}
            type="button"
            onClick={() => onChange(preset.seconds)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              duration === preset.seconds
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:bg-muted'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
