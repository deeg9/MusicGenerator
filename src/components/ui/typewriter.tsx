'use client';

import { useEffect, useState, useCallback } from 'react';

interface TypewriterProps {
  words: string[];
  speed?: number;
  delayBetweenWords?: number;
  cursor?: boolean;
  cursorChar?: string;
}

export function Typewriter({
  words,
  speed = 100,
  delayBetweenWords = 2000,
  cursor = true,
  cursorChar = '|',
}: TypewriterProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const type = useCallback(() => {
    const word = words[currentWordIndex];
    if (!isDeleting) {
      setCurrentText(word.substring(0, currentText.length + 1));
      if (currentText === word) {
        setTimeout(() => setIsDeleting(true), delayBetweenWords);
        return;
      }
    } else {
      setCurrentText(word.substring(0, currentText.length - 1));
      if (currentText === '') {
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
        return;
      }
    }
  }, [currentText, currentWordIndex, isDeleting, words, delayBetweenWords]);

  useEffect(() => {
    const timer = setTimeout(type, isDeleting ? speed / 2 : speed);
    return () => clearTimeout(timer);
  }, [type, speed, isDeleting]);

  return (
    <span>
      {currentText}
      {cursor && <span className="animate-pulse ml-0.5">{cursorChar}</span>}
    </span>
  );
}
