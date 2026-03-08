import Link from 'next/link';

export function HeroSection() {
  return (
    <div className="bg-gradient-to-b from-secondary/20 via-background to-background">
      <section className="py-20 md:py-28 px-4 text-center">
        <div className="container mx-auto max-w-3xl flex flex-col items-center gap-6">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Turn your feelings into a song
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
            Create a one-of-a-kind personalized song for someone you love.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/quiz"
              className="rounded-full bg-primary text-primary-foreground px-8 py-3.5 font-bold text-lg shadow-medium hover:bg-primary/90 hover:shadow-elevated hover:-translate-y-0.5 transition-all"
            >
              Create Your Song
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-border/60 bg-white px-8 py-3.5 font-bold text-lg text-foreground hover:bg-muted hover:-translate-y-0.5 transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
