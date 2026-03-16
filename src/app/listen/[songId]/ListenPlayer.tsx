'use client';

interface ListenPlayerProps {
  src: string;
}

export function ListenPlayer({ src }: ListenPlayerProps) {
  return (
    <audio
      src={src}
      controls
      className="w-full rounded-lg"
      style={{ colorScheme: 'light' }}
    />
  );
}
