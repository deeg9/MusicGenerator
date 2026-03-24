'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Heart, Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { HeroAudioCard } from './HeroAudioCard';
import { HomepageChatBox } from './HomepageChatBox';
import { SongPreviewCarousel } from './SongPreviewCarousel';
import { trackCtaClicked } from '@/lib/analytics';

const ROTATING_WORDS = ['feelings', 'dreams', 'words', 'ideas', 'love', 'heart'];

export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [badgeIcon, setBadgeIcon] = useState<'star' | 'heart'>('star');
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const badgeInterval = setInterval(() => {
      setBadgeIcon((prev) => (prev === 'star' ? 'heart' : 'star'));
    }, 2000);
    const wordInterval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2500);
    return () => {
      clearInterval(badgeInterval);
      clearInterval(wordInterval);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-gradient-to-b from-secondary/20 via-background to-background">
      <section className="py-10 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl flex flex-col items-center gap-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 rounded-full px-4 py-1.5 text-sm font-semibold">
            {badgeIcon === 'star' ? (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 animate-star-main" />
            ) : (
              <Heart className="h-4 w-4 fill-red-400 text-red-400 animate-heart-finale" />
            )}
            #1 Rated Personalized Gift 2026
          </div>

          {/* Heading — centered, wide */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-center">
            Turn your{' '}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.em
                key={ROTATING_WORDS[wordIndex]}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-primary italic font-bold inline-block"
              >
                {ROTATING_WORDS[wordIndex]}
              </motion.em>
            </AnimatePresence>{' '}
            into a song.
          </h1>

          {/* Subtitle — visible on all screen sizes */}
          <p className="text-lg text-muted-foreground max-w-lg text-center">
            Create a one-of-a-kind song for someone you love — in seconds.
          </p>

          {/* CTA + social proof — moved above chat box and media */}
          <div className="flex flex-col gap-4 items-center">
            <Link
              href="/quiz"
              onClick={() => trackCtaClicked('hero', "OMG Yes! Let's Go")}
              className="rounded-full bg-primary text-primary-foreground px-8 py-3.5 font-bold text-lg shadow-medium hover:bg-primary/90 hover:shadow-elevated hover:-translate-y-0.5 transition-all"
            >
              OMG Yes! Let&apos;s Go
            </Link>
            <p className="text-sm text-muted-foreground">100% Free — No sign up required</p>
            <div className="flex items-center gap-3">
              {/* Overlapping avatars */}
              <div className="flex -space-x-2">
                {[12, 25, 32, 47].map((id) => (
                  <img
                    key={id}
                    src={`https://i.pravatar.cc/40?img=${id}`}
                    alt=""
                    className="h-8 w-8 rounded-full border-2 border-white"
                  />
                ))}
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground font-medium">10,000+ Songs</span>
            </div>
          </div>

          {/* Chat box — hidden on mobile, visible on md+ */}
          <div className="hidden md:block w-full">
            <HomepageChatBox />
          </div>

          {/* Song preview carousel — hidden on mobile, visible on md+ */}
          <div className="hidden md:block w-full">
            <SongPreviewCarousel />
          </div>

          {/* Media: video stacked on mobile, side-by-side on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-center">
            {/* Left: Hero video */}
            <div className="relative rounded-xl overflow-hidden shadow-medium">
              <video
                ref={videoRef}
                src="/hero-video-new.mp4"
                poster="/hero-video-poster.webp"
                muted
                loop
                playsInline
                className="w-full h-auto"
              />
              <button
                onClick={() => {
                  const video = videoRef.current;
                  if (!video) return;
                  video.muted = !video.muted;
                  setMuted(video.muted);
                }}
                className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            {/* Right: Hero image with floating audio card — desktop only */}
            <div className="relative flex-col items-center hidden md:flex">
              <div className="relative w-full">
                <Image
                  src="/hero-emotional.webp"
                  alt="A couple sharing an emotional moment with a personalized song"
                  width={500}
                  height={600}
                  className="rounded-2xl shadow-elevated w-full h-auto"
                />
                {/* Floating audio card */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10">
                  <HeroAudioCard />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
