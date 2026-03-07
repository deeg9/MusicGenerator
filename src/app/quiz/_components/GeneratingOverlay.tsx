'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Music } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface GeneratingOverlayProps {
  recipientName: string;
  reducedMotion?: boolean;
}

// ─── Rotating messages ────────────────────────────────────────────────────────

function getMessages(name: string): string[] {
  const displayName = name.trim() || 'them';
  return [
    `Composing ${displayName}'s song...`,
    'Weaving your memories into music...',
    `Adding a personal touch for ${displayName}...`,
    'Almost there \u2014 your gift is taking shape...',
    `The final notes for ${displayName} are coming together...`,
  ];
}

const MESSAGE_INTERVAL_MS = 2500;

// ─── Component ────────────────────────────────────────────────────────────────

export function GeneratingOverlay({ recipientName, reducedMotion }: GeneratingOverlayProps) {
  const messages = getMessages(recipientName);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
      {/* Pulsing music icon */}
      <motion.div
        animate={reducedMotion ? {} : { scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
      >
        <Music size={48} className="text-primary" />
      </motion.div>

      {/* Rotating personalized messages */}
      <div className="h-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
            className="text-xl font-display text-foreground text-center"
          >
            {messages[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Subtle timing note */}
      <p className="text-sm text-muted-foreground">This usually takes around 10 minutes — we&apos;ll redirect you when it&apos;s ready</p>
    </div>
  );
}
