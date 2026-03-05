/**
 * OKLCH to hex color conversion utility.
 *
 * Provides getCssColorAsHex for reading CSS custom properties (OKLCH format)
 * and converting them to hex strings for JS color consumers like wavesurfer.js.
 *
 * No external dependencies — pure math based on the OKLAB spec.
 */

function srgbGamma(v: number): number {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}

function toHex(v: number): string {
  return Math.round(v * 255)
    .toString(16)
    .padStart(2, '0');
}

/**
 * Convert OKLCH (L, C, H) to a CSS hex string.
 *
 * @param l - Lightness in [0, 1]
 * @param c - Chroma (typically 0–0.4)
 * @param h - Hue angle in degrees [0, 360]
 * @returns 6-character lowercase hex string, e.g. "#2ea0c9"
 */
export function oklchToHex(l: number, c: number, h: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // OKLCH → OKLAB → LMS (cube-root compressed) → LMS (linear) → linear sRGB
  const lr = l + 0.3963377774 * a + 0.2158037573 * b;
  const lg = l - 0.1055613458 * a - 0.0638541728 * b;
  const lb = l - 0.0894841775 * a - 1.291485548 * b;

  const r = Math.max(0, Math.min(1, srgbGamma(lr ** 3)));
  const g = Math.max(0, Math.min(1, srgbGamma(lg ** 3)));
  const bv = Math.max(0, Math.min(1, srgbGamma(lb ** 3)));

  return `#${toHex(r)}${toHex(g)}${toHex(bv)}`;
}

/**
 * Read a CSS custom property from an element and return it as a hex string.
 *
 * Handles OKLCH format returned by getComputedStyle (both decimal and percentage L):
 *   "oklch(0.75 0.150 225)"   — decimal notation
 *   "oklch(75% 0.150 225)"    — percentage notation (some browsers)
 *
 * @param varName - CSS variable name, e.g. "--primary"
 * @param el - DOM element to read computed style from
 * @returns Hex color string, or "#888888" fallback for unparseable values
 */
export function getCssColorAsHex(varName: string, el: Element): string {
  const raw = getComputedStyle(el).getPropertyValue(varName).trim();

  // Match both "oklch(0.75 0.150 225)" and "oklch(75% 0.150 225)"
  const m = raw.match(/oklch\(\s*([0-9.]+)(%?)\s+([0-9.]+)\s+([0-9.]+)/);
  if (!m) return '#888888';

  const isPercent = m[2] === '%';
  const l = isPercent ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  const c = parseFloat(m[3]);
  const h = parseFloat(m[4]);

  return oklchToHex(l, c, h);
}
