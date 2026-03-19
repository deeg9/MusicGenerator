'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Heart, Volume2, VolumeX } from 'lucide-react';
import { HeroAudioCard } from './HeroAudioCard';
import { HomepageChatBox } from './HomepageChatBox';
import { SongPreviewCarousel } from './SongPreviewCarousel';
import { trackCtaClicked } from '@/lib/analytics';

export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [badgeIcon, setBadgeIcon] = useState<'star' | 'heart'>('star');

  useEffect(() => {
    const interval = setInterval(() => {
      setBadgeIcon((prev) => (prev === 'star' ? 'heart' : 'star'));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  return (
    <div className="bg-gradient-to-b from-secondary/20 via-background to-background">
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="flex flex-col gap-6 items-center lg:items-start">
            {/* Animated badge */}
            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 rounded-full px-4 py-1.5 text-sm font-semibold w-fit">
              {badgeIcon === 'star' ? (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 animate-star-main" />
              ) : (
                <Heart className="h-4 w-4 fill-red-400 text-red-400 animate-heart-finale" />
              )}
              #1 Rated Personalized Gift 2026
            </div>

            {/* Heading */}
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-center lg:text-left">
              Turn your <em className="text-primary not-italic font-bold italic">feelings</em> into a song.
            </h1>

            {/* Homepage chat box */}
            <HomepageChatBox />

            {/* Song preview carousel */}
            <SongPreviewCarousel />

            {/* Video player */}
            <div className="relative rounded-xl overflow-hidden shadow-medium max-w-md">
              <video
                ref={videoRef}
                src="/hero-video.mp4"
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

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-md text-center lg:text-left">
              Create a one-of-a-kind personalized song for someone you love. Our AI turns your memories, inside jokes, and heartfelt feelings into a beautiful, original song in seconds.
            </p>

            {/* CTA + social proof */}
            <div className="flex flex-col gap-4 items-center lg:items-start">
              <Link
                href="/quiz"
                onClick={() => trackCtaClicked('hero', "OMG Yes! Let's Go")}
                className="rounded-full bg-primary text-primary-foreground px-8 py-3.5 font-bold text-lg shadow-medium hover:bg-primary/90 hover:shadow-elevated hover:-translate-y-0.5 transition-all w-fit"
              >
                OMG Yes! Let&apos;s Go
              </Link>
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
          </div>

          {/* Right Column */}
          <div className="relative flex flex-col items-center gap-6">
            {/* Hero image with floating audio card */}
            <div className="relative w-full max-w-md">
              <Image
                src="/hero-emotional.png"
                alt="A couple sharing an emotional moment with a personalized song"
                width={500}
                height={600}
                className="rounded-2xl shadow-elevated w-full h-auto"
                priority
              />
              {/* Floating audio card */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10">
                <HeroAudioCard />
              </div>
            </div>

            {/* CTA below image */}
            <Link
              href="/quiz"
              onClick={() => trackCtaClicked('hero_right', 'Create My Song Please!')}
              className="mt-8 rounded-full bg-primary text-primary-foreground px-8 py-3.5 font-bold text-lg shadow-medium hover:bg-primary/90 hover:shadow-elevated hover:-translate-y-0.5 transition-all"
            >
              Create My Song Please!
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
