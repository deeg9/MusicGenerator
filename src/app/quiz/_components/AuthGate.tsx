'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ChevronLeft, Music } from 'lucide-react';
import { signupSchema } from '@/lib/supabase/auth-schemas';
import { signup } from '@/app/signup/actions';
import { login } from '@/app/login/actions';
import { signInWithGoogle } from '@/app/login/actions';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

interface AuthGateProps {
  onBack: () => void;
}

export function AuthGate({ onBack }: AuthGateProps) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    if (mode === 'signup') {
      const result = signupSchema.safeParse({ email, password });
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        setFieldErrors({
          email: errors.email?.[0],
          password: errors.password?.[0],
        });
        return;
      }
      if (password !== confirmPassword) {
        setFieldErrors({ confirmPassword: 'Passwords do not match' });
        return;
      }
    }

    const formData = new FormData();
    formData.set('email', email);
    formData.set('password', password);
    formData.set('next', '/quiz?generate=true');

    startTransition(async () => {
      const action = mode === 'signup' ? signup : login;
      const response = await action(formData);
      if (response?.error) {
        setServerError(response.error);
      }
    });
  }

  function handleGoogleSignIn() {
    startGoogleTransition(() => signInWithGoogle('/quiz?generate=true'));
  }

  return (
    <div className="w-full max-w-md">
      {/* Song icon + headline */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Music className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          Your song is ready to be created!
        </h1>
        <p className="text-muted-foreground text-sm">
          Sign up for free to generate your personalized song
        </p>
      </div>

      <div className="bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-medium)] p-8">
        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 mb-6">
            {serverError}
          </div>
        )}

        {/* Google sign-in */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isPending || isGooglePending}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
        >
          {isGooglePending ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs text-muted-foreground">
            <span className="bg-card px-2">or</span>
          </div>
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="gate-email" className="block text-sm font-medium text-foreground mb-1.5">
              Email
            </label>
            <input
              id="gate-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="you@example.com"
              disabled={isPending}
            />
            {fieldErrors.email && (
              <p className="text-sm text-red-600 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="gate-password" className="block text-sm font-medium text-foreground mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="gate-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-sm text-red-600 mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="gate-confirm" className="block text-sm font-medium text-foreground mb-1.5">
                Confirm Password
              </label>
              <input
                id="gate-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Re-enter your password"
                disabled={isPending}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || isGooglePending}
            className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            {mode === 'signup' ? 'Sign Up & Create My Song' : 'Log In & Create My Song'}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-muted-foreground">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setServerError(null); setFieldErrors({}); }}
                className="text-primary font-medium hover:underline"
              >
                Log in
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setServerError(null); setFieldErrors({}); }}
                className="text-primary font-medium hover:underline"
              >
                Sign up
              </button>
            </>
          )}
        </p>
      </div>

      {/* Back to quiz link */}
      <button
        type="button"
        onClick={onBack}
        className="mt-4 flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mx-auto"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to quiz
      </button>
    </div>
  );
}
