'use client';

import { useState, useTransition } from 'react';
import { Loader2, Send } from 'lucide-react';

interface RecipientEmailFormProps {
  songId: string; // UUID from songs table — must be provided by parent
}

export function RecipientEmailForm({ songId }: RecipientEmailFormProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !songId) return;

    setError(null);

    startTransition(async () => {
      const res = await fetch('/api/send-recipient-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, recipientEmail: email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        // Check for "not finalized" in response body
        let bodyText = '';
        try {
          bodyText = await res.text();
        } catch {
          // Ignore read errors
        }

        if (bodyText.toLowerCase().includes('not finalized')) {
          setError('Song is still processing -- try again in a moment.');
        } else {
          setError('Could not send -- please try again.');
        }
      }
    });
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        Gift email sent! They'll receive it shortly.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
      <label htmlFor="recipient-email" className="text-sm font-medium text-foreground">
        Send this song as a gift
      </label>
      <div className="flex gap-2">
        <input
          id="recipient-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recipient@example.com"
          disabled={isPending}
          className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="submit"
          disabled={isPending || !email}
          className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center gap-2"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Send
        </button>
      </div>
      {/* SUCC-03: Privacy framing */}
      <p className="text-xs text-muted-foreground">
        Private link -- no marketing, ever.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
