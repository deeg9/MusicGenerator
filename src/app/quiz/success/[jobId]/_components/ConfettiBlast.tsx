'use client';

import { useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Brand colors: blue-500, yellow-400, white, blue-300 approximations
const BRAND_COLORS = ['#4a90d9', '#f5d060', '#ffffff', '#7bb8f5'];

export function ConfettiBlast() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    let timer: ReturnType<typeof setTimeout>;

    void import('canvas-confetti').then(({ default: confetti }) => {
      void confetti({
        origin: { x: 0.25, y: 0.5 },
        particleCount: 80,
        spread: 70,
        colors: BRAND_COLORS,
      });
      timer = setTimeout(() => {
        void confetti({
          origin: { x: 0.75, y: 0.5 },
          particleCount: 80,
          spread: 70,
          colors: BRAND_COLORS,
        });
      }, 150);
    });

    return () => clearTimeout(timer);
  }, [reducedMotion]);

  // canvas-confetti appends its own canvas to body
  return null;
}
