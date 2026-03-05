interface ModeToggleProps {
  mode: 'simple' | 'custom';
  onChange: (mode: 'simple' | 'custom') => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="relative flex rounded-lg border border-border bg-secondary p-1">
      {/* Sliding indicator */}
      <div
        className="absolute top-1 bottom-1 left-1 rounded-md bg-card shadow-sm transition-transform duration-200 ease-in-out w-[calc(50%-4px)]"
        style={{ transform: mode === 'custom' ? 'translateX(calc(100% + 8px))' : 'translateX(0)' }}
        aria-hidden="true"
      />
      {/* Simple button */}
      <button
        type="button"
        onClick={() => onChange('simple')}
        className={`relative z-10 flex-1 px-4 py-1.5 text-sm font-medium transition-colors ${
          mode === 'simple' ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        Simple
      </button>
      {/* Custom button */}
      <button
        type="button"
        onClick={() => onChange('custom')}
        className={`relative z-10 flex-1 px-4 py-1.5 text-sm font-medium transition-colors ${
          mode === 'custom' ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        Custom
      </button>
    </div>
  );
}
