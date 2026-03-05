'use client';

import { useState } from 'react';
import { ExampleCard } from './ExampleCard';
import { Typewriter } from './ui/typewriter';

const EXAMPLES = [
  {
    id: '1',
    title: 'Birthday Jazz',
    genre: 'Jazz, Warm',
    audioUrl: '/api/examples/jazz-birthday',
  },
  {
    id: '2',
    title: 'Love Ballad',
    genre: 'Pop, Romantic',
    audioUrl: '/api/examples/love-ballad',
  },
  {
    id: '3',
    title: 'Graduation Anthem',
    genre: 'Indie, Uplifting',
    audioUrl: '/api/examples/graduation',
  },
];

const TYPEWRITER_WORDS = [
  'a birthday song',
  'a love letter in melody',
  'a lullaby',
  'something unforgettable',
];

export function HeroSection() {
  const [activeExampleId, setActiveExampleId] = useState<string | null>(null);

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Amber radial glow blob — editorial brand warmth */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center -translate-y-8"
        aria-hidden="true"
      >
        <div className="h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      {/* Animated waveform accent background */}
      <div className="pointer-events-none absolute inset-0 opacity-10" aria-hidden="true">
        <svg
          className="animate-wave h-full w-full"
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,100 C150,20 350,180 600,100 C850,20 1050,180 1200,100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-primary"
          />
          <path
            d="M0,120 C200,40 400,160 600,120 C800,40 1000,160 1200,120"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
          />
          <path
            d="M0,80 C100,160 300,20 600,80 C900,160 1100,20 1200,80"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-primary"
          />
        </svg>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        {/* Headline — brand editorial scale with Bricolage Grotesque */}
        <h1 className="relative text-6xl sm:text-7xl font-display font-bold tracking-tight text-foreground">
          Create{' '}
          <span className="text-primary">
            <Typewriter words={TYPEWRITER_WORDS} speed={80} cursorChar="|" />
          </span>
        </h1>

        {/* Subtitle */}
        <p className="relative mt-6 text-xl text-muted-foreground max-w-xl mx-auto">
          Describe a vibe, add your own lyrics, and get a unique song in seconds. No musical skills
          needed.
        </p>

        {/* CTA — amber accent = action */}
        <a
          href="#create"
          className="relative inline-block mt-10 bg-accent text-accent-foreground font-semibold px-8 py-3 rounded-lg hover:bg-accent/90 transition-colors"
        >
          Start Creating
        </a>

        {/* Example cards */}
        <div className="relative mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {EXAMPLES.map((example) => (
            <ExampleCard
              key={example.id}
              title={example.title}
              genre={example.genre}
              audioUrl={example.audioUrl}
              isActive={activeExampleId === example.id}
              onPlay={() => setActiveExampleId(example.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
