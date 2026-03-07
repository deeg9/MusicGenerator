import Link from 'next/link'

export default async function AuthErrorPage(
  props: { searchParams: Promise<{ error?: string }> }
) {
  const searchParams = await props.searchParams
  const message =
    searchParams.error ?? 'The link you followed may have expired or is invalid.'

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-medium)] p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground mb-3">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground mb-8">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Try logging in
          </Link>
          <Link
            href="/forgot-password"
            className="border border-border rounded-lg px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    </main>
  )
}
