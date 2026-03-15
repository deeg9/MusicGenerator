'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { claimSongsForCurrentUser } from './actions';

/**
 * Two-step email confirmation page.
 *
 * The email links here with token_hash & type as query params.
 * The page renders a "Confirm" button — this prevents email prefetchers
 * (Google, Outlook, etc.) from consuming the one-time token via GET request.
 * Verification only happens when the user explicitly clicks the button.
 *
 * Supabase email template should use:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
 */
export default function ConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'confirming' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'signup' | 'email' | 'recovery' | 'invite' | 'email_change' | null;
  const next = searchParams.get('next') ?? '/dashboard';

  async function handleConfirm() {
    if (!tokenHash || !type) return;

    setStatus('confirming');

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      setErrorMessage(error.message);
      setStatus('error');
      return;
    }

    setStatus('success');

    // Claim anonymous songs for new signups (non-fatal)
    if (type === 'signup') {
      try {
        await claimSongsForCurrentUser();
      } catch {
        // Non-fatal — confirmation succeeded, don't block redirect
      }
    }

    if (type === 'recovery') {
      router.push('/update-password');
    } else {
      const safeNext = next.startsWith('/') ? next : '/dashboard';
      router.push(safeNext);
    }
  }

  if (!tokenHash || !type) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="font-display text-2xl text-foreground mb-2">Invalid Link</h1>
          <p className="text-muted-foreground text-sm">
            This confirmation link is missing required parameters.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <span className="text-3xl">
            {status === 'success' ? '✓' : status === 'error' ? '!' : '✉'}
          </span>
        </div>

        {status === 'idle' && (
          <>
            <div>
              <h1 className="font-display text-2xl text-foreground mb-2">Confirm Your Email</h1>
              <p className="text-muted-foreground text-sm">
                Click below to verify your email and activate your account.
              </p>
            </div>
            <button
              onClick={handleConfirm}
              className="bg-primary text-primary-foreground rounded-full px-8 py-3 font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              Confirm My Email
            </button>
          </>
        )}

        {status === 'confirming' && (
          <div>
            <h1 className="font-display text-2xl text-foreground mb-2">Confirming...</h1>
            <p className="text-muted-foreground text-sm">Please wait while we verify your email.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <h1 className="font-display text-2xl text-foreground mb-2">Email Confirmed!</h1>
            <p className="text-muted-foreground text-sm">Redirecting you now...</p>
          </div>
        )}

        {status === 'error' && (
          <>
            <div>
              <h1 className="font-display text-2xl text-foreground mb-2">Confirmation Failed</h1>
              <p className="text-muted-foreground text-sm mb-2">{errorMessage}</p>
              <p className="text-muted-foreground text-xs">
                The link may have expired. Try signing up again to receive a new confirmation email.
              </p>
            </div>
            <a
              href="/signup"
              className="bg-primary text-primary-foreground rounded-full px-8 py-3 font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              Back to Sign Up
            </a>
          </>
        )}
      </div>
    </main>
  );
}
