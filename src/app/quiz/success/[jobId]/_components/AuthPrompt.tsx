'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface AuthPromptProps {
  jobId: string;
}

export function AuthPrompt({ jobId }: AuthPromptProps) {
  const [isAnon, setIsAnon] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAnon(user === null);
    });
  }, []);

  // Don't render while checking (null) or if authenticated (false)
  if (isAnon !== true) return null;

  // Construct a next param that returns user to this page after signup
  const returnUrl = `/quiz/success/${jobId}`;

  return (
    <div className="w-full bg-secondary/40 rounded-2xl border border-border p-6 text-center flex flex-col items-center gap-4">
      <h2 className="font-display text-xl text-foreground">Save your song</h2>
      <p className="text-muted-foreground text-sm max-w-sm">
        Create a free account to keep this song in your library and access it anytime.
      </p>
      <div className="flex gap-3">
        <Link
          href={`/signup?next=${encodeURIComponent(returnUrl)}`}
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Sign up free
        </Link>
        <Link
          href={`/login?next=${encodeURIComponent(returnUrl)}`}
          className="border border-border text-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
