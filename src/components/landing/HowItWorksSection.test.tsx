import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HowItWorksSection } from './HowItWorksSection';

describe('HowItWorksSection', () => {
  it('renders section with id="how-it-works"', () => {
    render(<HowItWorksSection />);
    const section = document.querySelector('#how-it-works');
    expect(section).not.toBeNull();
  });

  it('renders 3 step number labels', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('Step 1')).not.toBeNull();
    expect(screen.getByText('Step 2')).not.toBeNull();
    expect(screen.getByText('Step 3')).not.toBeNull();
  });

  it('renders step titles', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('Tell us about them')).not.toBeNull();
    expect(screen.getByText('Choose your style')).not.toBeNull();
    expect(screen.getByText('Get your song')).not.toBeNull();
  });
});
