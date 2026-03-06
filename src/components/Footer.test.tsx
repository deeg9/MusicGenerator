import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/link for test environment
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import { Footer } from './Footer';

describe('Footer', () => {
  it('renders without error', () => {
    render(<Footer />);
    expect(document.querySelector('footer')).not.toBeNull();
  });

  it('contains Notevra branding text', () => {
    render(<Footer />);
    const notevraElements = screen.getAllByText('Notevra');
    expect(notevraElements.length).toBeGreaterThan(0);
  });

  it('contains copyright text', () => {
    render(<Footer />);
    expect(screen.getByText(/All rights reserved/i)).not.toBeNull();
  });

  it('renders Product column heading', () => {
    render(<Footer />);
    expect(screen.getByText('Product')).not.toBeNull();
  });

  it('renders Company column heading', () => {
    render(<Footer />);
    expect(screen.getByText('Company')).not.toBeNull();
  });

  it('renders Legal column heading', () => {
    render(<Footer />);
    expect(screen.getByText('Legal')).not.toBeNull();
  });

  it('renders How it Works navigation link', () => {
    render(<Footer />);
    expect(screen.getByText('How it Works')).not.toBeNull();
  });

  it('renders Privacy Policy navigation link', () => {
    render(<Footer />);
    expect(screen.getByText('Privacy Policy')).not.toBeNull();
  });
});
