import { Heart, Music, Sparkles } from 'lucide-react';
import { STEPS } from './data/landing-data';

const ICON_MAP = {
  Heart,
  Music,
  Sparkles,
} as const;

type IconName = keyof typeof ICON_MAP;

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 px-4 bg-muted">
      <div className="container mx-auto max-w-5xl">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          How it works
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Three simple steps from idea to tears (the happy kind).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, index) => {
            const Icon = ICON_MAP[step.icon as IconName] ?? Heart;
            return (
              <div
                key={step.title}
                className="flex flex-col items-center text-center gap-4 bg-card rounded-xl p-6 shadow-subtle"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Icon className="h-7 w-7" />
                </div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Step {index + 1}
                </span>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
