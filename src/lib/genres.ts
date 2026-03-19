/**
 * Shared genre definitions — used by the quiz Step 2 selector and the homepage chat box.
 */

export type GenreOption = { id: string; label: string; mood: string };

export const GENRE_OPTIONS: GenreOption[] = [
  { id: 'Pop', label: 'Pop', mood: 'Upbeat and fun' },
  { id: 'R&B / Soul', label: 'R&B / Soul', mood: 'Smooth and heartfelt' },
  { id: 'Folk / Acoustic', label: 'Folk / Acoustic', mood: 'Warm and intimate' },
  { id: 'Rock', label: 'Rock', mood: 'Bold and energetic' },
  { id: 'Hip-Hop', label: 'Hip-Hop', mood: 'Rhythmic and expressive' },
  { id: 'Classical', label: 'Classical', mood: 'Elegant and timeless' },
  { id: 'Country', label: 'Country', mood: 'Storytelling and soulful' },
];
