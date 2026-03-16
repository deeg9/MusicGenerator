'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { trackCtaClicked } from '@/lib/analytics';

export function BottomCtaSection() {
  return (
    <section className="bg-background py-20 px-4">
      <div className="container mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          Ready to make them cry?
        </h2>
        <p className="font-display text-lg italic text-primary mb-10">
          (Happy tears only)
        </p>
        <Link
          href="/quiz"
          onClick={() => trackCtaClicked('bottom_cta', 'Yes! Start Song Now')}
          className="inline-block bg-primary text-primary-foreground font-bold rounded-full px-8 py-3 hover:bg-primary/90 transition-colors"
        >
          Yes! Start Song Now
        </Link>
        <div className="mt-10 flex items-center justify-center gap-2 text-muted-foreground">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm font-medium">100% Satisfaction Guarantee</span>
        </div>
      </div>
    </section>
  );
}
