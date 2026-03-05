// ─────────────────────────────────────────────────────────────────────────────
// Descriptive download filename builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a descriptive, URL-safe download filename from a prompt text and variant index.
 *
 * Sanitization:
 * - Lowercase
 * - Strip non-alphanumeric characters (preserving spaces and hyphens)
 * - Trim whitespace
 * - Replace spaces with hyphens
 * - Cap at 40 characters
 *
 * @param promptText - The generation prompt (song style/description)
 * @param variantIndex - Zero-based variant index (0 → "variant-1")
 * @param ext - File extension ('mp3' | 'wav')
 * @returns Descriptive filename like "upbeat-pop-song-variant-1.mp3"
 */
export function buildDownloadFilename(
  promptText: string,
  variantIndex: number,
  ext: 'mp3' | 'wav',
): string {
  const sanitized = promptText
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);

  const slug = sanitized || 'song';

  return `${slug}-variant-${variantIndex + 1}.${ext}`;
}
