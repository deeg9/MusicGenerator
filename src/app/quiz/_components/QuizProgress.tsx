interface QuizProgressProps {
  /** 0-indexed current step number */
  currentStep: number;
  totalSteps: number;
}

export function QuizProgress({ currentStep, totalSteps }: QuizProgressProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-muted-foreground">
        Step {currentStep + 1} of {totalSteps}
      </p>
      <div
        className="flex items-center gap-2"
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemax={totalSteps}
        aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
      >
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className={[
              'h-2 rounded-full transition-all duration-300',
              i < currentStep
                ? 'w-2 bg-primary/50'   // completed
                : i === currentStep
                  ? 'w-4 bg-primary'     // active (wider)
                  : 'w-2 bg-border',     // upcoming
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
