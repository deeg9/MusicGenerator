import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Typewriter to avoid animation complexity in tests
vi.mock('./ui/typewriter', () => ({
  Typewriter: ({ words }: { words: string[] }) => (
    <span data-testid="typewriter">{words[0]}</span>
  ),
}));

// Mock ExampleCard to avoid wavesurfer dependency
vi.mock('./ExampleCard', () => ({
  ExampleCard: ({ title }: { title: string }) => (
    <div data-testid="example-card">{title}</div>
  ),
}));

import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  it('h1 has font-display class (Bricolage Grotesque)', () => {
    render(<HeroSection />);
    const h1 = document.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1!.className).toContain('font-display');
  });

  it('h1 has text-6xl class for large editorial headline', () => {
    render(<HeroSection />);
    const h1 = document.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1!.className).toContain('text-6xl');
  });

  it('CTA link has bg-accent class (amber action color)', () => {
    render(<HeroSection />);
    const cta = document.querySelector('a[href="#create"]');
    expect(cta).not.toBeNull();
    expect(cta!.className).toContain('bg-accent');
  });

  it('CTA link does NOT have bg-primary class (changed to amber accent)', () => {
    render(<HeroSection />);
    const cta = document.querySelector('a[href="#create"]');
    expect(cta).not.toBeNull();
    expect(cta!.className).not.toContain('bg-primary');
  });

  it('amber glow element has bg-accent/20 and blur-3xl classes', () => {
    render(<HeroSection />);
    // Find the aria-hidden glow container
    const glowContainers = document.querySelectorAll('[aria-hidden="true"]');
    let glowDiv: Element | null = null;
    glowContainers.forEach((container) => {
      const inner = container.querySelector('.blur-3xl');
      if (inner && inner.className.includes('bg-accent/20')) {
        glowDiv = inner;
      }
    });
    expect(glowDiv).not.toBeNull();
  });

  it('typewriter wrapper span has text-primary class (sky-blue)', () => {
    render(<HeroSection />);
    const typewriter = screen.getByTestId('typewriter');
    const wrapper = typewriter.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper!.className).toContain('text-primary');
  });

  it('section inner content div has py-24 class for editorial padding', () => {
    render(<HeroSection />);
    // The inner content container should have py-24
    const contentDiv = document.querySelector('.py-24');
    expect(contentDiv).not.toBeNull();
  });
});
