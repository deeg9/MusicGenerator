'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface TypewriterProps {
  words: string[];
  speed?: number;
  delayBetweenWords?: number;
  cursorChar?: string;
  className?: string;
}

export function Typewriter({
  words,
  speed = 80,
  delayBetweenWords = 2000,
  cursorChar = '\u2588', // block cursor ██
  className,
}: TypewriterProps) {
  const reducedMotion = useReducedMotion();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Find longest word for CLS prevention
  const longestWord = words.reduce((a, b) => (a.length > b.length ? a : b), '');

  const type = useCallback(() => {
    const word = words[currentWordIndex];
    if (!isDeleting) {
      const next = word.substring(0, currentText.length + 1);
      setCurrentText(next);
      if (next === word) {
        timerRef.current = setTimeout(() => setIsDeleting(true), delayBetweenWords);
        return;
      }
    } else {
      const next = word.substring(0, currentText.length - 1);
      setCurrentText(next);
      if (next === '') {
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
        return;
      }
    }
  }, [currentText, currentWordIndex, isDeleting, words, delayBetweenWords]);

  useEffect(() => {
    if (reducedMotion) return;
    timerRef.current = setTimeout(type, isDeleting ? speed / 2 : speed);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [type, speed, isDeleting, reducedMotion]);

  // Reduced motion: show first word statically
  if (reducedMotion) {
    return <span className={className}>{words[0]}</span>;
  }

  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      {/* Invisible measuring span to reserve width and prevent CLS */}
      <span className="invisible" aria-hidden="true">
        {longestWord}
      </span>

      {/* Visible text positioned over the measuring span */}
      <span className="absolute left-0 top-0">
        <AnimatePresence mode="popLayout">
          {currentText.split('').map((char, i) => (
            <motion.span
              key={`${currentWordIndex}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.05 }}
            >
              {char}
            </motion.span>
          ))}
        </AnimatePresence>

        {/* Blinking block cursor */}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.7, repeat: Infinity, repeatType: 'reverse' }}
          className="ml-0.5"
          aria-hidden="true"
        >
          {cursorChar}
        </motion.span>
      </span>
    </span>
  );
}
