'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface SidebarContextValue {
  isOpen: boolean;
  isMobileOpen: boolean;
  setOpen: (open: boolean) => void;
  setMobileOpen: (open: boolean) => void;
  toggle: () => void;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [isMobileOpen, setMobileOpen] = useState(false);

  const toggle = useCallback(() => setOpen((o) => !o), []);
  const toggleMobile = useCallback(() => setMobileOpen((o) => !o), []);

  return (
    <SidebarContext.Provider value={{ isOpen, isMobileOpen, setOpen, setMobileOpen, toggle, toggleMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
