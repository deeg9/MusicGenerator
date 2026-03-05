interface ModeToggleProps {
  mode: 'simple' | 'custom';
  onChange: (mode: 'simple' | 'custom') => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => onChange('simple')}
        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
          mode === 'simple'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-muted-foreground hover:bg-muted'
        }`}
      >
        Simple
      </button>
      <button
        type="button"
        onClick={() => onChange('custom')}
        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
          mode === 'custom'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-muted-foreground hover:bg-muted'
        }`}
      >
        Custom
      </button>
    </div>
  );
}
