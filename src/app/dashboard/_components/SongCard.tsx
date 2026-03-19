'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Lock, Loader2, AlertCircle, Share2, MoreVertical, Pencil, Trash2, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SongPlayer } from '@/app/quiz/success/[jobId]/_components/SongPlayer';
import { UnlockModal, type CreditState } from '@/components/UnlockModal';

interface SongCardProps {
  songId: string;
  title: string | null;
  recipientName: string;
  relationship: string;
  genre: string;
  status: 'generating' | 'completed' | 'failed';
  createdAt: string;
  audioUrl: string | null;
  downloadUrl: string | null;
  downloadFilename: string;
  hasSubscription?: boolean;
  isUnlocked?: boolean;
  isUnlimitedTier?: boolean;
}

export function SongCard({
  songId,
  title,
  recipientName,
  relationship,
  genre,
  status,
  createdAt,
  audioUrl,
  downloadUrl,
  downloadFilename,
  hasSubscription = false,
  isUnlocked = false,
  isUnlimitedTier = false,
}: SongCardProps) {
  const router = useRouter();
  const [localUnlocked, setLocalUnlocked] = useState(false);
  const showFull = !!(isUnlocked || isUnlimitedTier || localUnlocked);
  const formattedDate = new Date(createdAt).toLocaleDateString();

  const displayTitle = title || `A song for ${recipientName}`;

  // ── Unlock modal state ──────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [creditState, setCreditState] = useState<CreditState | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);

  // ── Three-dot menu state ────────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Inline edit state ───────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayTitle);
  const [saving, setSaving] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // ── Share state ─────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  // Close menu on click outside or Escape
  useEffect(() => {
    if (!menuOpen) {
      setDeleteConfirm(false);
      return;
    }

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  // Reset delete confirm after 3 seconds
  useEffect(() => {
    if (!deleteConfirm) return;
    const timer = setTimeout(() => setDeleteConfirm(false), 3000);
    return () => clearTimeout(timer);
  }, [deleteConfirm]);

  // Focus input when editing starts
  useEffect(() => {
    if (editing) editInputRef.current?.focus();
  }, [editing]);

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleUnlockClick() {
    setLoadingCheck(true);
    try {
      const res = await fetch('/api/subscription/check');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.status === 404 || !res.ok) {
        setCreditState({ type: 'no-subscription' });
        setShowModal(true);
        return;
      }
      const data = await res.json();
      if (!data.active) {
        setCreditState({ type: 'no-subscription' });
      } else if (data.songsRemaining > 0) {
        setCreditState({
          type: 'has-credits',
          songsRemaining: data.songsRemaining,
          songsPerMonth: data.songsPerMonth,
          tier: data.tier,
        });
      } else {
        setCreditState({
          type: 'no-credits',
          songsPerMonth: data.songsPerMonth,
          tier: data.tier,
          currentPeriodEnd: data.currentPeriodEnd,
        });
      }
      setShowModal(true);
    } catch {
      setCreditState({ type: 'no-subscription' });
      setShowModal(true);
    } finally {
      setLoadingCheck(false);
    }
  }

  async function handleConfirmUnlock() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/songs/${songId}/unlock`, { method: 'POST' });
      const data = await res.json();
      if (data.unlocked) {
        setShowModal(false);
        setLocalUnlocked(true);
        router.refresh();
      } else if (data.error === 'insufficient_credits') {
        setCreditState({
          type: 'no-credits',
          songsPerMonth: data.songsPerMonth,
          tier: data.tier,
          currentPeriodEnd: data.currentPeriodEnd,
        });
      }
    } catch {
      setShowModal(false);
    } finally {
      setConfirming(false);
    }
  }

  async function handleShare() {
    const shareUrl = `${window.location.origin}/share/${songId}`;
    const shareData = {
      title: displayTitle,
      text: `Listen to "${displayTitle}" — a personalized song made on Notevra`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: prompt
      window.prompt('Copy this link:', shareUrl);
    }
  }

  function handleEditStart() {
    setEditValue(displayTitle);
    setEditing(true);
    setMenuOpen(false);
  }

  async function handleEditSave() {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed.length > 100) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/songs/${songId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  function handleEditCancel() {
    setEditing(false);
    setEditValue(displayTitle);
  }

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleEditSave();
      if (e.key === 'Escape') handleEditCancel();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editValue],
  );

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/songs/${songId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  }

  return (
    <div className="relative bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
      {/* Header: title + badges + three-dot menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {editing ? (
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  ref={editInputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  maxLength={100}
                  className="font-display text-xl text-foreground bg-transparent border-b-2 border-primary outline-none flex-1 min-w-0"
                />
                <button
                  onClick={handleEditSave}
                  disabled={saving || !editValue.trim()}
                  className="p-1 text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
                  aria-label="Save title"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleEditCancel}
                  className="p-1 text-muted-foreground hover:bg-muted rounded transition-colors"
                  aria-label="Cancel editing"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h2 className="font-display text-xl text-foreground truncate">
                {displayTitle}
              </h2>
            )}
            {!editing && status === 'completed' && !showFull && (
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                30s Preview
              </span>
            )}
            {status === 'generating' && (
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating
              </span>
            )}
            {status === 'failed' && (
              <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                <AlertCircle className="w-3 h-3" />
                Failed
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground capitalize">
            {relationship} · {genre} · {formattedDate}
          </p>
        </div>

        {/* Three-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            aria-label="Song options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-border/40 py-1 min-w-[160px] z-10">
              <button
                onClick={handleEditStart}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Title
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${
                  deleteConfirm
                    ? 'text-red-600 hover:bg-red-50 font-medium'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {deleteConfirm ? 'Are you sure?' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Audio player */}
      {status === 'completed' && audioUrl && (
        <SongPlayer
          src={audioUrl}
          isPreview={!showFull}
          songTitle={displayTitle}
          recipientName={recipientName}
        />
      )}

      {status === 'generating' && (
        <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Your song is being created. This usually takes a few seconds.</span>
        </div>
      )}

      {status === 'failed' && (
        <div className="flex items-center gap-3 py-4 text-sm text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Something went wrong generating this song.</span>
        </div>
      )}

      {/* Action buttons */}
      {status === 'completed' && (
        showFull ? (
          <div className="flex gap-3">
            <a
              href={downloadUrl ?? '#'}
              download={downloadFilename}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
            <button
              onClick={handleShare}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              <Share2 className="w-4 h-4" />
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleUnlockClick}
            disabled={loadingCheck}
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loadingCheck ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            Use Credit to Unlock Full Song
          </button>
        )
      )}

      {status === 'failed' && (
        <Link
          href="/quiz"
          className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
        >
          Try Again
        </Link>
      )}

      {creditState && (
        <UnlockModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmUnlock}
          confirming={confirming}
          creditState={creditState}
        />
      )}
    </div>
  );
}
