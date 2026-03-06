import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDuration, deriveTitle, formatRelativeDate } from './display-utils';

describe('formatDuration', () => {
  it('formats 120 seconds as "2:00"', () => {
    expect(formatDuration(120)).toBe('2:00');
  });

  it('formats 45 seconds as "0:45"', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats 243 seconds as "4:03"', () => {
    expect(formatDuration(243)).toBe('4:03');
  });

  it('formats 0 seconds as "0:00"', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats 60 seconds as "1:00"', () => {
    expect(formatDuration(60)).toBe('1:00');
  });
});

describe('deriveTitle', () => {
  it('returns "Untitled Song" for null', () => {
    expect(deriveTitle(null)).toBe('Untitled Song');
  });

  it('returns "Untitled Song" for empty string', () => {
    expect(deriveTitle('')).toBe('Untitled Song');
  });

  it('returns "Untitled Song" for whitespace-only string', () => {
    expect(deriveTitle('  ')).toBe('Untitled Song');
  });

  it('returns the prompt unchanged when under 40 chars', () => {
    expect(deriveTitle('Short prompt')).toBe('Short prompt');
  });

  it('truncates at 40 chars with ellipsis when over 40 chars', () => {
    const long = 'A very long prompt text that exceeds forty characters easily';
    const result = deriveTitle(long);
    expect(result).toBe('A very long prompt text that exceeds for\u2026');
    expect(result.length).toBe(41); // 40 chars + ellipsis character
  });

  it('trims whitespace before checking length', () => {
    expect(deriveTitle('  hello  ')).toBe('hello');
  });
});

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Fix "now" to 2026-03-05T12:00:00Z
    vi.setSystemTime(new Date('2026-03-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for a date less than 1 hour ago', () => {
    const thirtyMinAgo = new Date('2026-03-05T11:30:00Z');
    expect(formatRelativeDate(thirtyMinAgo)).toBe('Just now');
  });

  it('returns "N hours ago" for a date 5 hours ago', () => {
    const fiveHoursAgo = new Date('2026-03-05T07:00:00Z');
    expect(formatRelativeDate(fiveHoursAgo)).toBe('5 hours ago');
  });

  it('returns "Yesterday" for a date 1.5 days ago', () => {
    const yesterdayish = new Date('2026-03-03T23:00:00Z'); // ~37 hours ago
    expect(formatRelativeDate(yesterdayish)).toBe('Yesterday');
  });

  it('returns abbreviated month + day for dates 5 days ago', () => {
    const fiveDaysAgo = new Date('2026-02-28T12:00:00Z');
    const result = formatRelativeDate(fiveDaysAgo);
    // Should be something like "Feb 28"
    expect(result).toMatch(/^[A-Z][a-z]+ \d+$/);
  });

  it('returns "1 hours ago" for exactly 1 hour ago', () => {
    const oneHourAgo = new Date('2026-03-05T11:00:00Z');
    expect(formatRelativeDate(oneHourAgo)).toBe('1 hours ago');
  });
});
