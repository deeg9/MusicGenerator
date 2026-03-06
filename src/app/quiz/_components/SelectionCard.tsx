interface SelectionCardProps {
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}

export function SelectionCard({
  label,
  subLabel,
  icon,
  selected,
  onSelect,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        'flex flex-col items-center gap-2 rounded-xl p-4 text-center min-h-11',
        'border-2 cursor-pointer transition-all duration-200',
        selected
          ? 'border-primary bg-primary/10 shadow-medium'
          : 'border-border bg-card shadow-subtle hover:border-primary/50',
      ].join(' ')}
    >
      {icon && <span className="text-2xl" aria-hidden="true">{icon}</span>}
      <span className="font-semibold text-sm text-foreground">{label}</span>
      {subLabel && (
        <span className="text-xs text-muted-foreground">{subLabel}</span>
      )}
    </button>
  );
}
