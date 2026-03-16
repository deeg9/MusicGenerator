'use client';

import { useState } from 'react';
import { Video, Heart, Copy, Check } from 'lucide-react';
import { trackSongShared } from '@/lib/analytics';

interface SharePromptProps {
  songId?: string;
}

export function SharePrompt({ songId = '' }: SharePromptProps) {
  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    trackSongShared(songId);
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="w-full bg-muted/40 rounded-2xl border border-border p-6 text-center flex flex-col items-center gap-4">
      {/* Icon cluster */}
      <div className="flex items-center gap-2 text-primary">
        <Video className="w-5 h-5" />
        <Heart className="w-5 h-5 text-yellow-500 fill-yellow-400" />
        <Video className="w-5 h-5 scale-x-[-1]" />
      </div>

      {/* Headline */}
      <h2 className="font-display text-xl text-foreground">Capture the moment</h2>

      {/* Body */}
      <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
        When you share this song, hit record. Watching someone hear a song made just for them —
        that reaction is priceless. Share the video and the song together for extra magic.
      </p>

      {/* Copy link button */}
      <button
        onClick={handleCopyLink}
        className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Link copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy link to this song
          </>
        )}
      </button>
    </div>
  );
}
