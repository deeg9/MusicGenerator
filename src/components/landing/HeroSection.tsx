import Link from 'next/link';
import { HeroAudioCard } from './HeroAudioCard';

export function HeroSection() {
  return (
    <div className="bg-gradient-to-b from-secondary/20 via-background to-background">
      <section className="py-20 md:py-28 px-4 text-center">
        <div className="container mx-auto max-w-3xl flex flex-col items-center gap-6">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Turn your feelings into a song
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
            Create a one-of-a-kind personalized song for someone you love — in seconds.
          </p>
          <Link
            href="/quiz"
            className="rounded-full bg-primary text-primary-foreground px-8 py-3.5 font-bold text-lg shadow-medium hover:bg-primary/90 hover:shadow-elevated hover:-translate-y-0.5 transition-all"
          >
            Create Your Song
          </Link>
          <div className="mt-2 flex justify-center w-full">
            <HeroAudioCard />
          </div>
        </div>
      </section>
    </div>
  );
}
