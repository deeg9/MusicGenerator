'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function CheckEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-medium)] p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-6">
          <span className="text-3xl">&#9993;</span>
        </div>

        <h1 className="font-display text-2xl font-bold text-foreground mb-3">
          Check your inbox
        </h1>

        <p className="text-sm text-foreground mb-2">
          We sent a confirmation link to{' '}
          {email ? <span className="font-medium">{email}</span> : 'your email'}.
          Click the link to verify your account.
        </p>

        <p className="text-xs text-muted-foreground mb-6">
          Don&apos;t see it? Check your spam folder.
        </p>

        <Link
          href="/signup"
          className="text-sm text-primary font-medium hover:underline"
        >
          Try again
        </Link>
      </div>
    </main>
  )
}
