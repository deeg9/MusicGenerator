'use client';

import { Lock, Loader2 } from 'lucide-react';

interface SubscribeToDownloadProps {
  onUnlockClick: () => void;
  loading: boolean;
}

export function SubscribeToDownload({ onUnlockClick, loading }: SubscribeToDownloadProps) {
  return (
    <button
      onClick={onUnlockClick}
      disabled={loading}
      className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Lock className="w-4 h-4" />
      )}
      {loading ? 'Checking...' : 'Unlock to Download'}
    </button>
  );
}
