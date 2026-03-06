'use client';

import { useState } from 'react';

const VIDEO_ID = 'aJOTlE1K90k';

export function VideoSection() {
  const [loaded, setLoaded] = useState(false);

  return (
    <section id="examples" className="bg-muted py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-10">
          See the magic happen
        </h2>
        <div className="aspect-video rounded-xl overflow-hidden shadow-elevated bg-navy-900 relative">
          {!loaded ? (
            <button
              onClick={() => setLoaded(true)}
              className="absolute inset-0 w-full h-full flex items-center justify-center group"
              aria-label="Play video"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`}
                alt="Video thumbnail"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <span className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-white/90 shadow-lg group-hover:bg-white transition-colors">
                <svg
                  className="w-8 h-8 text-primary ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          ) : (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1`}
              title="Notevra song demo"
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          )}
        </div>
      </div>
    </section>
  );
}
