import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';

// Mock next/link for test environment
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// Mock signOut server action
vi.mock('@/app/login/actions', () => ({
  signOut: vi.fn(),
}));

import { HeaderClient } from './HeaderClient';

describe('HeaderClient — anonymous state', () => {
  it('renders without error', () => {
    render(<HeaderClient user={null} />);
    expect(document.querySelector('header')).not.toBeNull();
  });

  it('contains Notevra wordmark', () => {
    render(<HeaderClient user={null} />);
    const notevraElements = screen.getAllByText('Notevra');
    expect(notevraElements.length).toBeGreaterThan(0);
  });

  it('contains Create Your Song link/button', () => {
    render(<HeaderClient user={null} />);
    const ctaElements = screen.getAllByText('Create Your Song');
    expect(ctaElements.length).toBeGreaterThan(0);
  });

  it('contains How it Works nav link', () => {
    render(<HeaderClient user={null} />);
    const links = screen.getAllByText('How it Works');
    expect(links.length).toBeGreaterThan(0);
  });

  it('contains Reviews nav link', () => {
    render(<HeaderClient user={null} />);
    const links = screen.getAllByText('Reviews');
    expect(links.length).toBeGreaterThan(0);
  });

  it('shows Sign Up link when user is null', () => {
    render(<HeaderClient user={null} />);
    expect(screen.getByText('Sign Up')).toBeDefined();
  });

  it('shows Log In link when user is null', () => {
    render(<HeaderClient user={null} />);
    expect(screen.getByText('Log In')).toBeDefined();
  });

  it('does not show avatar button when user is null', () => {
    render(<HeaderClient user={null} />);
    expect(screen.queryByLabelText('User menu')).toBeNull();
  });
});

describe('HeaderClient — authenticated state', () => {
  const mockUser = { id: '123', email: 'test@notevra.com' } as User;

  it('shows user initial avatar when authenticated', () => {
    render(<HeaderClient user={mockUser} />);
    expect(screen.getByLabelText('User menu')).toBeDefined();
    // The button contains the first letter of the email uppercased
    const avatarBtn = screen.getByLabelText('User menu');
    expect(avatarBtn.textContent).toBe('T');
  });

  it('does not show Sign Up link when authenticated', () => {
    render(<HeaderClient user={mockUser} />);
    expect(screen.queryByText('Sign Up')).toBeNull();
  });

  it('does not show Log In link when authenticated', () => {
    render(<HeaderClient user={mockUser} />);
    expect(screen.queryByText('Log In')).toBeNull();
  });

  it('Create Your Song CTA is visible when authenticated', () => {
    render(<HeaderClient user={mockUser} />);
    const ctaElements = screen.getAllByText('Create Your Song');
    expect(ctaElements.length).toBeGreaterThan(0);
  });
});
