/**
 * Quiz data type contract — shared between Phase 15 (quiz funnel) and Phase 16 (song generation).
 * Import from this file in both quiz/page.tsx and the generation API route.
 */

export type RelationshipType = 'Mom' | 'Dad' | 'Partner' | 'Friend' | 'Child' | 'Other';

export type VoicePreference = 'Male' | 'Female' | 'No Preference';

export interface QuizData {
  // Step 1 — Relationship & recipient
  relationshipType: RelationshipType | '';
  recipientName: string;
  // Step 2 — Genre & voice
  genre: string;
  voicePreference: VoicePreference;
  // Step 3 — Qualities
  qualities: string;
  // Step 4 — Memories
  memories: string;
  // Step 5 — Message
  message: string;
  // Step 6 — Language & email (optional)
  language: string;
  email: string;
  emailOptIn: boolean;
}

export const INITIAL_QUIZ_DATA: QuizData = {
  relationshipType: '',
  recipientName: '',
  genre: '',
  voicePreference: 'No Preference',
  qualities: '',
  memories: '',
  message: '',
  language: 'English',
  email: '',
  emailOptIn: false,
};
