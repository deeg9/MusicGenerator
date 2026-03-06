import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/link for test environment
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import { Header } from './Header';

describe('Header', () => {
  it('renders without error', () => {
    render(<Header />);
    expect(document.querySelector('header')).not.toBeNull();
  });

  it('contains Notevra wordmark', () => {
    render(<Header />);
    const notevraElements = screen.getAllByText('Notevra');
    expect(notevraElements.length).toBeGreaterThan(0);
  });

  it('contains Create Your Song link/button', () => {
    render(<Header />);
    const ctaElements = screen.getAllByText('Create Your Song');
    expect(ctaElements.length).toBeGreaterThan(0);
  });

  it('contains How it Works nav link', () => {
    render(<Header />);
    const links = screen.getAllByText('How it Works');
    expect(links.length).toBeGreaterThan(0);
  });

  it('contains Examples nav link', () => {
    render(<Header />);
    const links = screen.getAllByText('Examples');
    expect(links.length).toBeGreaterThan(0);
  });

  it('contains Reviews nav link', () => {
    render(<Header />);
    const links = screen.getAllByText('Reviews');
    expect(links.length).toBeGreaterThan(0);
  });
});
