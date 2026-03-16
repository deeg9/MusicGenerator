'use client';

import { useRef, useState } from 'react';
import { Star, Volume2, VolumeX } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Michael T.',
    avatar: 'https://i.pravatar.cc/80?img=11',
    purchased: 'Pop Ballad',
    quote:
      "I surprised my wife with a personalized song for our anniversary. When she heard our story in the lyrics, she couldn't hold back tears. Best gift I've ever given.",
    rating: 5,
  },
  {
    name: 'Sarah J.',
    avatar: 'https://i.pravatar.cc/80?img=5',
    purchased: 'Country Hit',
    quote:
      "The lyrics mentioned our inside joke about pineapple pizza and I lost it. It's like the AI actually knew us. My husband plays it every morning now.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  return (
    <section id="reviews" className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-4xl">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          What our current customers are saying!
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

        {/* 2 testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {TESTIMONIALS.map((testimonial) => (
            <div
              key={testimonial.name}
              className="bg-card rounded-xl p-6 shadow-subtle flex flex-col gap-4"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 text-yellow-400 fill-current"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-2">
                <img
                  src={testimonial.avatar}
                  alt=""
                  className="h-10 w-10 rounded-full"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Purchased &ldquo;{testimonial.purchased}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Video */}
        <div className="relative rounded-xl overflow-hidden shadow-elevated max-w-2xl mx-auto">
          <video
            ref={videoRef}
            src="/testimonial-video.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-auto"
          />
          <button
            onClick={toggleMute}
            className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-center text-muted-foreground mt-4 italic">
          Join thousands of happy customers creating moments like this.
        </p>
      </div>
    </section>
  );
}
