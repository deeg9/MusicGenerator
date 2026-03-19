'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { GENRE_OPTIONS } from '@/lib/genres';
import { HOMEPAGE_INPUT_KEY, type HomepageInput } from '@/lib/quiz-types';

export function HomepageChatBox() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const selectedGenreLabel = genre
    ? (GENRE_OPTIONS.find((g) => g.id === genre)?.label ?? 'Genre')
    : 'Genre';

  async function handleSend() {
    if (!prompt.trim()) {
      setError('Tell us about your song idea');
      return;
    }
    setError(null);

    localStorage.setItem(
      HOMEPAGE_INPUT_KEY,
      JSON.stringify({ prompt: prompt.trim(), genre } as HomepageInput),
    );

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      router.push('/quiz');
    } else {
      router.push('/signup?next=/quiz');
    }
  }

  return (
    <div className="max-w-xl w-full bg-white rounded-2xl shadow-medium p-4">
      {/* Textarea */}
      <textarea
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="What do you want this song to be about..."
        className="w-full resize-none border-none focus:ring-0 focus:outline-none text-foreground placeholder:text-muted-foreground text-sm bg-transparent"
      />

      {/* Error */}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      {/* Bottom bar */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        {/* Genre dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            {selectedGenreLabel}
            <ChevronDown className="h-4 w-4" />
          </button>

          {dropdownOpen && (
            <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-elevated py-1 z-50 min-w-[180px]">
              {GENRE_OPTIONS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGenre(g.id);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                >
                  <span className="block text-sm font-medium text-foreground">{g.label}</span>
                  <span className="block text-xs text-muted-foreground">{g.mood}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
