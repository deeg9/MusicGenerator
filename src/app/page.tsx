export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <main className="flex flex-col items-center gap-6 text-center px-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          MusicGenerator
        </h1>
        <p className="text-zinc-400 text-lg max-w-md">
          Phase 1 Infrastructure — API routes are the primary deliverable.
          The UI will be built in Phase 2.
        </p>
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-4 text-left text-sm text-zinc-500">
          <p className="font-mono">POST /api/generate</p>
          <p className="font-mono">GET  /api/status/[jobId]</p>
          <p className="font-mono">GET  /api/audio/[key]</p>
        </div>
      </main>
    </div>
  );
}
