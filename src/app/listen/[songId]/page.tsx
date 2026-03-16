import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { getAudioPresignedUrl } from '@/lib/r2';
import { ListenPlayer } from './ListenPlayer';

interface ListenPageProps {
  params: Promise<{ songId: string }>;
}

export async function generateMetadata({ params }: ListenPageProps) {
  const { songId } = await params;
  const [song] = await db
    .select({ recipientName: songs.recipientName })
    .from(songs)
    .where(eq(songs.id, songId))
    .limit(1);

  const name = song?.recipientName ?? 'You';
  return {
    title: `A song for ${name} | Notevra`,
  };
}

export default async function ListenPage({ params }: ListenPageProps) {
  const { songId } = await params;

  const [song] = await db
    .select({
      id: songs.id,
      recipientName: songs.recipientName,
      relationship: songs.relationship,
      genre: songs.genre,
      status: songs.status,
      r2Mp3Key: songs.r2Mp3Key,
    })
    .from(songs)
    .where(eq(songs.id, songId))
    .limit(1);

  if (!song || song.status !== 'completed' || !song.r2Mp3Key) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#faf9f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p
            style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              color: '#6ba3c9',
              fontSize: '22px',
              fontWeight: 700,
              marginBottom: '16px',
            }}
          >
            Notevra
          </p>
          <p style={{ color: '#7a7c8a', fontSize: '16px' }}>
            This song is not available yet. It may still be generating, or the link may be invalid.
          </p>
        </div>
      </div>
    );
  }

  const audioUrl = await getAudioPresignedUrl(song.r2Mp3Key, 3600);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#faf9f7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: "'DM Sans', Helvetica, Arial, sans-serif",
      }}
    >
      <div style={{ width: '100%', maxWidth: '512px' }}>
        {/* Header */}
        <p
          style={{
            fontFamily: "'Libre Baskerville', Georgia, serif",
            color: '#6ba3c9',
            fontSize: '22px',
            fontWeight: 700,
            margin: '0 0 32px 0',
            textAlign: 'center',
          }}
        >
          Notevra
        </p>

        {/* Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
          }}
        >
          <h1
            style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              color: '#2d2e38',
              fontSize: '22px',
              fontWeight: 700,
              margin: '0 0 8px 0',
            }}
          >
            A song for {song.recipientName}
          </h1>

          <p
            style={{
              color: '#7a7c8a',
              fontSize: '14px',
              margin: '0 0 16px 0',
            }}
          >
            From your {song.relationship}
          </p>

          {/* Genre pill */}
          <span
            style={{
              display: 'inline-block',
              backgroundColor: '#e8f2f9',
              color: '#6ba3c9',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '999px',
              marginBottom: '24px',
            }}
          >
            {song.genre}
          </span>

          {/* Audio player */}
          <ListenPlayer src={audioUrl} songId={song.id} />
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            color: '#7a7c8a',
            fontSize: '12px',
            marginTop: '24px',
          }}
        >
          Made with{' '}
          <a
            href="https://notevra.net"
            style={{ color: '#6ba3c9', textDecoration: 'none' }}
          >
            Notevra
          </a>
        </p>
      </div>
    </div>
  );
}
