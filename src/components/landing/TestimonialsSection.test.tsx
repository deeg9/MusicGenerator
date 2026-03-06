import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestimonialsSection } from './TestimonialsSection';

describe('TestimonialsSection', () => {
  it('renders section with id="reviews"', () => {
    render(<TestimonialsSection />);
    const section = document.querySelector('#reviews');
    expect(section).not.toBeNull();
  });

  it('renders at least 3 testimonial cards by name', () => {
    render(<TestimonialsSection />);
    // Each testimonial has a name rendered on screen
    expect(screen.getByText('Sarah M.')).not.toBeNull();
    expect(screen.getByText('James & Priya')).not.toBeNull();
    expect(screen.getByText('Olivia T.')).not.toBeNull();
  });

  it('renders star rating elements for each testimonial', () => {
    render(<TestimonialsSection />);
    // Each testimonial has 5 stars; 4 testimonials = 20 star SVG elements
    const stars = document.querySelectorAll('svg[aria-hidden="true"]');
    // 4 testimonials × 5 stars = 20 stars minimum
    expect(stars.length).toBeGreaterThanOrEqual(20);
  });
});
