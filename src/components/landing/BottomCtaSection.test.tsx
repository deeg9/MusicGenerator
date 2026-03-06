import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/link for test environment
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import { BottomCtaSection } from './BottomCtaSection';

describe('BottomCtaSection', () => {
  it('renders CTA headline "Ready to make them cry?"', () => {
    render(<BottomCtaSection />);
    expect(screen.getByText('Ready to make them cry?')).not.toBeNull();
  });

  it('renders link to /quiz', () => {
    render(<BottomCtaSection />);
    const link = document.querySelector('a[href="/quiz"]');
    expect(link).not.toBeNull();
  });

  it('renders 3 trust badges', () => {
    render(<BottomCtaSection />);
    expect(screen.getByText('Instant delivery')).not.toBeNull();
    expect(screen.getByText('100% unique')).not.toBeNull();
    expect(screen.getByText('No musical skill needed')).not.toBeNull();
  });
});
