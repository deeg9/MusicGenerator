'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { signOut } from '@/app/login/actions';

export function HeaderClient({ user }: { user: User | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!dropdownOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  const userInitial = user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md group-hover:scale-105 transition-transform">
            <span className="font-display font-bold text-sm">N</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">Notevra</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
            <a href="#reviews" className="hover:text-foreground transition-colors">Reviews</a>
          </nav>

          {/* Auth links or avatar dropdown */}
          {!user ? (
            <div className="flex items-center gap-4">
              <Link
                href="/signup"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Log In
              </Link>
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User menu"
                className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                {userInitial}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-border/40 py-1 min-w-[160px]">
                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    My Songs
                  </Link>
                  <div className="border-t border-border/40 my-1" />
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      Sign Out
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          <Link
            href="/quiz"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all min-h-11 inline-flex items-center"
          >
            Create Your Song
          </Link>
        </div>

        {/* Mobile: CTA + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <Link
            href="/quiz"
            className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all min-h-11 inline-flex items-center"
          >
            Create Your Song
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-white px-6 py-4">
          <nav className="flex flex-col gap-3 text-sm font-medium text-muted-foreground">
            <a
              href="#how-it-works"
              className="hover:text-foreground transition-colors py-1.5"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it Works
            </a>
            <a
              href="#reviews"
              className="hover:text-foreground transition-colors py-1.5"
              onClick={() => setMobileMenuOpen(false)}
            >
              Reviews
            </a>

            {/* Mobile auth links */}
            {!user ? (
              <>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-foreground transition-colors py-1.5"
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-foreground transition-colors py-1.5"
                >
                  Log In
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-foreground transition-colors py-1.5"
                >
                  My Songs
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full text-left hover:text-foreground transition-colors py-1.5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Out
                  </button>
                </form>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
