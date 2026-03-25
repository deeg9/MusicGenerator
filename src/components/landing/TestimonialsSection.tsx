'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Star, Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';

interface Testimonial {
  name: string;
  avatar: string;
  purchased: string;
  quote: string;
  rating: number;
}

const COLUMN_1: Testimonial[] = [
  {
    name: 'Michael T.',
    avatar: 'https://i.pravatar.cc/80?img=11',
    purchased: 'Pop Birthday Song',
    quote: "I surprised my wife with a personalized song for our anniversary. When she heard our story in the lyrics, she couldn't hold back tears. Best gift I've ever given.",
    rating: 5,
  },
  {
    name: 'Sarah J.',
    avatar: 'https://i.pravatar.cc/80?img=5',
    purchased: 'Country Ballad',
    quote: "The lyrics mentioned our inside joke about pineapple pizza and I lost it. It's like the AI actually knew us. My husband plays it every morning now.",
    rating: 5,
  },
  {
    name: 'David R.',
    avatar: 'https://i.pravatar.cc/80?img=12',
    purchased: 'R&B Love Song',
    quote: "Made a song for my girlfriend's birthday. She started crying 30 seconds in. We've listened to it together every night since. This is the future of gifts.",
    rating: 5,
  },
  {
    name: 'Priya K.',
    avatar: 'https://i.pravatar.cc/80?img=32',
    purchased: 'Classical Lullaby',
    quote: "I created a lullaby for my newborn daughter with her name in it. Now it's the only thing that puts her to sleep. I cry every time I hear it.",
    rating: 5,
  },
];

const COLUMN_2: Testimonial[] = [
  {
    name: 'Lisa M.',
    avatar: 'https://i.pravatar.cc/80?img=9',
    purchased: 'Folk Acoustic',
    quote: "Got this for my dad's 70th birthday. The whole family was in tears. He said it was the most thoughtful gift he's ever received. Worth every penny.",
    rating: 5,
  },
  {
    name: 'James K.',
    avatar: 'https://i.pravatar.cc/80?img=53',
    purchased: 'Pop Song',
    quote: "I was skeptical at first — an AI making a personal song? But when I heard my mom's name and our memories in the lyrics, I was completely blown away.",
    rating: 5,
  },
  {
    name: 'Amanda W.',
    avatar: 'https://i.pravatar.cc/80?img=25',
    purchased: 'R&B / Soul',
    quote: "My best friend and I have been through everything together. I made her a song for her wedding day and she played it during the reception. Not a dry eye in the room.",
    rating: 5,
  },
  {
    name: 'Carlos G.',
    avatar: 'https://i.pravatar.cc/80?img=14',
    purchased: 'Hip-Hop Track',
    quote: "Created a hip-hop track for my son's graduation. He thought I hired a real artist. When I told him it was AI with our family stories, he hugged me for five minutes straight.",
    rating: 5,
  },
];

const COLUMN_3: Testimonial[] = [
  {
    name: 'Rachel P.',
    avatar: 'https://i.pravatar.cc/80?img=44',
    purchased: 'Country Song',
    quote: "I lost my grandmother last year and made a song with all our favorite memories. It brought me so much comfort. I listen to it whenever I miss her. Thank you, Notevra.",
    rating: 5,
  },
  {
    name: 'Tyler B.',
    avatar: 'https://i.pravatar.cc/80?img=59',
    purchased: 'Rock Ballad',
    quote: "Used this for my proposal — had the song playing when I got down on one knee. She said yes before the chorus even hit. Absolutely magical moment.",
    rating: 5,
  },
  {
    name: 'Nina S.',
    avatar: 'https://i.pravatar.cc/80?img=47',
    purchased: 'Folk / Acoustic',
    quote: "My daughter is studying abroad and I sent her a personalized song. She called me crying happy tears saying it felt like a hug from home. This service is pure magic.",
    rating: 5,
  },
  {
    name: 'Marcus D.',
    avatar: 'https://i.pravatar.cc/80?img=68',
    purchased: 'Classical Piano',
    quote: "I've given my wife flowers, jewelry, trips — nothing has ever come close to the reaction she had hearing a song written just for her. She's made it her alarm tone.",
    rating: 5,
  },
];

function TestimonialsColumn({
  testimonials,
  duration,
  className,
}: {
  testimonials: Testimonial[];
  duration: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <motion.div
        animate={{ translateY: '-50%' }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
          repeatType: 'loop',
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {[0, 1].map((copyIndex) => (
          <React.Fragment key={copyIndex}>
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-border/50 shadow-subtle bg-card max-w-xs w-full"
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={t.avatar}
                    alt=""
                    className="h-10 w-10 rounded-full"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Purchased &ldquo;{t.purchased}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}

export function TestimonialsSection() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }

  return (
    <section id="reviews" className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          What our customers are saying
        </h2>

        {/* Animated stars */}
        <div className="flex justify-center gap-1 mb-12">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="h-6 w-6 text-yellow-400 fill-current animate-star-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        {/* Auto-scrolling testimonial columns */}
        <div className="relative h-[500px] overflow-hidden mb-12">
          {/* Gradient masks */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

          <div className="flex gap-6 justify-center h-full">
            <TestimonialsColumn
              testimonials={COLUMN_1}
              duration={18}
              className="hidden md:block overflow-hidden"
            />
            <TestimonialsColumn
              testimonials={COLUMN_2}
              duration={14}
              className="overflow-hidden"
            />
            <TestimonialsColumn
              testimonials={COLUMN_3}
              duration={16}
              className="hidden md:block overflow-hidden"
            />
          </div>
        </div>

        {/* Hero image with floating audio card */}
        <div>
          <div className="relative max-w-md mx-auto">
            <img
              src="/hero-emotional.webp"
              alt="A woman smiling while listening to a personalized song on her phone"
              className="rounded-2xl shadow-elevated w-full h-auto"
            />
            {/* Floating audio card */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10">
              <div className="flex items-center gap-4 bg-card rounded-xl px-5 py-4 shadow-medium max-w-sm w-full">
                <button
                  onClick={togglePlay}
                  aria-label={playing ? 'Pause' : 'Play'}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                >
                  {playing ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </button>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">
                    Happy Birthday, Mom
                  </span>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <audio
                  ref={audioRef}
                  src="/preview-mom.mp3"
                  onTimeUpdate={() => {
                    const audio = audioRef.current;
                    if (!audio || !audio.duration) return;
                    setProgress((audio.currentTime / audio.duration) * 100);
                  }}
                  onEnded={() => {
                    setPlaying(false);
                    setProgress(0);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-muted-foreground mt-10 italic">
          Join thousands of happy customers creating moments like this.
        </p>
      </div>
    </section>
  );
}
