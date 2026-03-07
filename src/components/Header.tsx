'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <div className="hidden md:flex items-center gap-8">
          <nav className="flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
            <a href="#reviews" className="hover:text-foreground transition-colors">Reviews</a>
          </nav>
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
          </nav>
        </div>
      )}
    </header>
  );
}
