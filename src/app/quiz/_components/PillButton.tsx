interface PillButtonProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
}

export function PillButton({ label, selected, onSelect }: PillButtonProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        'rounded-full px-5 py-2 text-sm font-medium transition-all duration-200',
        selected
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
