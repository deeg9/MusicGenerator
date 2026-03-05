interface VariantCardProps {
  variantIndex: number;
  url: string | null;
}

export function VariantCard({ variantIndex, url }: VariantCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
      <p className="text-sm font-medium text-zinc-400">Variant {variantIndex + 1}</p>
      {url ? (
        <>
          <audio controls src={url} className="w-full" preload="metadata" />
          <a
            href={url}
            download={`variant-${variantIndex + 1}.wav`}
            className="text-center text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Download WAV
          </a>
        </>
      ) : (
        <p className="text-sm text-zinc-500 italic">Audio unavailable</p>
      )}
    </div>
  );
}
