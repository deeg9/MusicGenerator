/**
 * Pure display formatting utilities for the library UI.
 * All functions are stateless and have no side effects.
 */

/**
 * Format a duration in seconds to mm:ss format.
 * Examples: 120 → "2:00", 45 → "0:45", 243 → "4:03"
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Derive a display title from a generation's prompt text.
 * Falls back to "Untitled Song" for empty/null/whitespace-only prompts.
 * Truncates at 40 characters with an ellipsis character (…) if longer.
 */
export function deriveTitle(promptText: string | null | undefined): string {
  const trimmed = (promptText ?? '').trim();
  if (!trimmed) return 'Untitled Song';
  if (trimmed.length <= 40) return trimmed;
  return trimmed.slice(0, 40) + '\u2026';
}

/**
 * Format a date relative to now.
 * - < 1 hour ago: "Just now"
 * - < 24 hours ago: "N hours ago"
 * - < 48 hours ago: "Yesterday"
 * - Otherwise: abbreviated month + day (e.g. "Mar 1")
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`;
  if (diffHours < 48) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
