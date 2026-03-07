import Link from 'next/link';
import { Gift, Fingerprint, Smile } from 'lucide-react';
import { TRUST_BADGES } from './data/landing-data';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Gift,
  Fingerprint,
  Smile,
};

export function BottomCtaSection() {
  return (
    <section className="bg-primary py-20 px-4">
      <div className="container mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          Ready to make them cry?
        </h2>
        <p className="text-primary-foreground/80 text-lg mb-10">
          The happy kind of tears. Create a song they&apos;ll never forget.
        </p>
        <Link
          href="/quiz"
          className="inline-block bg-white text-primary font-bold rounded-full px-8 py-3 hover:bg-white/90 transition-colors"
        >
          Create Your Song
        </Link>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
          {TRUST_BADGES.map((badge) => {
            const Icon = ICON_MAP[badge.icon];
            return (
              <div key={badge.label} className="flex items-center gap-2 text-primary-foreground/70">
                {Icon && <Icon className="w-5 h-5" />}
                <span className="text-sm font-medium">{badge.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
