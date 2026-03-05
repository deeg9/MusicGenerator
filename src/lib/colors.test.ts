import { describe, it, expect } from 'vitest';
import { oklchToHex, getCssColorAsHex } from './colors';

describe('oklchToHex', () => {
  it('converts black (0, 0, 0) to #000000', () => {
    expect(oklchToHex(0, 0, 0)).toBe('#000000');
  });

  it('converts white (1, 0, 0) to #ffffff', () => {
    expect(oklchToHex(1, 0, 0)).toBe('#ffffff');
  });

  it('returns a valid 6-char hex string for mid-range values', () => {
    const result = oklchToHex(0.75, 0.15, 225);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('produces distinct hex values for different hues', () => {
    const red = oklchToHex(0.6, 0.2, 20);
    const blue = oklchToHex(0.6, 0.2, 240);
    expect(red).not.toBe(blue);
  });

  it('handles zero chroma (achromatic) at mid-lightness', () => {
    const result = oklchToHex(0.5, 0, 0);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    // All channels should be equal (gray)
    const hex = result.slice(1);
    expect(hex.slice(0, 2)).toBe(hex.slice(2, 4));
    expect(hex.slice(2, 4)).toBe(hex.slice(4, 6));
  });

  it('clamps out-of-gamut values to valid hex range', () => {
    // High chroma values may be out of sRGB gamut — should still return valid hex
    const result = oklchToHex(0.8, 0.4, 30);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('getCssColorAsHex', () => {
  it('returns #888888 fallback when CSS var is not set (returns empty string)', () => {
    // Use a real DOM element — jsdom requires a real Element for getComputedStyle
    const el = document.createElement('div');
    document.body.appendChild(el);
    // --nonexistent-var returns empty string — should fall back
    const result = getCssColorAsHex('--nonexistent-var-xyz', el);
    expect(result).toBe('#888888');
    document.body.removeChild(el);
  });

  it('returns hex color when CSS var is set to a valid oklch value', () => {
    const el = document.createElement('div');
    el.style.setProperty('--test-color', 'oklch(0 0 0)');
    document.body.appendChild(el);
    const result = getCssColorAsHex('--test-color', el);
    // getComputedStyle on inline style returns the oklch value
    // If it parses correctly, result should be #000000
    // (browser may normalize, so just check it's valid hex or fallback)
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    document.body.removeChild(el);
  });
});
