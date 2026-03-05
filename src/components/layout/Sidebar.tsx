'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { House, Music, Library, Search, Menu, X } from 'lucide-react';
import { useSidebar } from './SidebarProvider';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV_ITEMS = [
  { label: 'Home', href: '#home', icon: House },
  { label: 'Create', href: '#create', icon: Music },
  { label: 'Library', href: '#', icon: Library },
  { label: 'Search', href: '#', icon: Search },
];

function handleCreateNav(e: React.MouseEvent) {
  e.preventDefault();
  window.dispatchEvent(new Event('navigate-create'));
  document.getElementById('create')?.scrollIntoView({ behavior: 'smooth' });
}

function NavLink({ href, icon: Icon, label, isOpen, onClick }: {
  href: string;
  icon: typeof House;
  label: string;
  isOpen: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <AnimatePresence>
        {isOpen && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden whitespace-nowrap text-sm font-medium"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </a>
  );
}

export function Sidebar() {
  const { isOpen, setOpen, isMobileOpen, setMobileOpen } = useSidebar();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-card text-foreground shadow-subtle md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <motion.aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={{ width: isOpen ? 240 : 60 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="hidden md:flex h-full flex-col border-r border-border bg-card overflow-hidden flex-shrink-0"
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 px-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display font-bold text-sm">
            N
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap font-display font-bold text-lg text-foreground"
              >
                Notera
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-2 pt-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              {...item}
              isOpen={isOpen}
              onClick={item.label === 'Create' ? handleCreateNav : undefined}
            />
          ))}
        </nav>

        {/* Bottom: Theme toggle */}
        <div className="border-t border-border p-2">
          <ThemeToggle />
        </div>
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
            />

            {/* Panel */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-card shadow-elevated md:hidden"
            >
              {/* Header */}
              <div className="flex h-16 items-center justify-between px-4">
                <span className="font-display font-bold text-lg text-foreground">Notera</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex flex-1 flex-col gap-1 px-3 pt-2">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      if (item.label === 'Create') handleCreateNav(e);
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </a>
                ))}
              </nav>

              {/* Bottom: Theme toggle */}
              <div className="border-t border-border p-3">
                <ThemeToggle />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
