'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'notevra-cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
      // Delay the entrance animation one frame so transition fires
      const raf = requestAnimationFrame(() => {
        setAnimated(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-50 transition-transform duration-300 ease-out ${
        animated ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-card border-t border-border shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="flex-1 text-sm text-muted-foreground leading-relaxed">
              We use cookies to keep you signed in and improve your experience.{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Learn more
              </Link>
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleDecline}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors border border-border text-foreground hover:bg-muted"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors bg-primary text-primary-foreground hover:opacity-90"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
