import { Heart, Music, Gift } from 'lucide-react';
import Link from 'next/link';
import { STEPS } from './data/landing-data';

const ICON_MAP = {
  Heart,
  Music,
  Gift,
} as const;

const ANIMATION_MAP: Record<string, string> = {
  Heart: 'animate-pulse-red',
  Music: 'animate-float',
  Gift: 'animate-shake',
};

type IconName = keyof typeof ICON_MAP;

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 px-4 bg-muted">
      <div className="container mx-auto max-w-5xl">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          How it works
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Three simple steps to create a memory that lasts forever.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, index) => {
            const Icon = ICON_MAP[step.icon as IconName] ?? Heart;
            const animation = ANIMATION_MAP[step.icon] ?? '';
            return (
              <div
                key={step.title}
                className="flex flex-col items-center text-center gap-4 bg-yellow-100/50 hover:bg-yellow-100 rounded-xl p-6 shadow-subtle transition-colors"
              >
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-medium rotate-3">
                  <Icon
                    className={`h-8 w-8 ${step.icon === 'Heart' ? 'text-red-500' : 'text-primary'} ${animation}`}
                  />
                  {step.icon === 'Gift' && (
                    <div className="absolute inset-0 pointer-events-none">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span
                          key={i}
                          className="confetti-piece absolute"
                          style={{
                            left: `${20 + Math.random() * 60}%`,
                            top: `${20 + Math.random() * 60}%`,
                            animationDelay: `${i * 0.3}s`,
                            backgroundColor: ['#60a5fa', '#facc15', '#f87171', '#34d399', '#a78bfa', '#fb923c'][i],
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {index + 1}. {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center mt-10">
          <Link
            href="/quiz"
            className="rounded-full bg-primary text-primary-foreground px-8 py-3.5 font-bold text-lg shadow-medium hover:bg-primary/90 hover:shadow-elevated hover:-translate-y-0.5 transition-all"
          >
            Ready Make My Song!
          </Link>
        </div>
      </div>
    </section>
  );
}
