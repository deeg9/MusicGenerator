import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Link,
  Hr,
  Font,
  Preview,
} from '@react-email/components';
import React from 'react';

interface SongReadyEmailProps {
  recipientName: string;
  listenUrl: string;
  downloadUrl: string;
  genre: string;
}

export function SongReadyEmail({
  recipientName,
  listenUrl,
  downloadUrl,
  genre,
}: SongReadyEmailProps) {
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Libre Baskerville"
          fallbackFontFamily="Georgia"
          webFont={{
            url: 'https://fonts.gstatic.com/s/librebaskerville/v14/kmKnZrc3Hgbbcjq75U4uslyuy4kn0pNexA.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>Your song for {recipientName} is ready to listen</Preview>
      <Body
        style={{
          backgroundColor: '#faf9f7',
          fontFamily: "'DM Sans', Helvetica, Arial, sans-serif",
          margin: 0,
          padding: '20px 0',
        }}
      >
        <Container
          style={{
            maxWidth: '520px',
            margin: '0 auto',
            paddingLeft: '20px',
            paddingRight: '20px',
          }}
        >
          {/* Baby blue header band */}
          <Section
            style={{
              backgroundColor: '#6ba3c9',
              borderRadius: '12px 12px 0 0',
              padding: '24px 32px',
            }}
          >
            <Text
              style={{
                fontFamily: "'Libre Baskerville', Georgia, serif",
                color: '#ffffff',
                fontSize: '22px',
                fontWeight: 700,
                margin: 0,
              }}
            >
              Notevra
            </Text>
          </Section>

          {/* White content section */}
          <Section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0 0 12px 12px',
              padding: '32px',
            }}
          >
            <Heading
              style={{
                fontFamily: "'Libre Baskerville', Georgia, serif",
                color: '#2d2e38',
                fontSize: '20px',
                fontWeight: 700,
                margin: '0 0 16px 0',
              }}
            >
              A song for {recipientName} is ready
            </Heading>

            <Text
              style={{
                fontFamily: "'DM Sans', Helvetica, Arial, sans-serif",
                color: '#2d2e38',
                fontSize: '16px',
                lineHeight: '1.6',
                margin: '0 0 24px 0',
              }}
            >
              Your {genre} song has been created and is ready to enjoy. We hope
              it brings a smile.
            </Text>

            <Button
              href={listenUrl}
              style={{
                backgroundColor: '#6ba3c9',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-block',
                marginBottom: '16px',
              }}
            >
              Listen Now
            </Button>

            <Text style={{ margin: '0 0 8px 0' }}>
              <Link
                href={downloadUrl}
                style={{
                  color: '#6ba3c9',
                  fontSize: '15px',
                  textDecoration: 'underline',
                  fontFamily: "'DM Sans', Helvetica, Arial, sans-serif",
                }}
              >
                Download MP3
              </Link>
            </Text>
          </Section>

          {/* Footer section */}
          <Section style={{ padding: '24px 32px' }}>
            <Text
              style={{
                fontFamily: "'DM Sans', Helvetica, Arial, sans-serif",
                color: '#7a7c8a',
                fontSize: '12px',
                margin: '0 0 4px 0',
              }}
            >
              noreply@notevra.com · notevra.com
            </Text>
            <Text
              style={{
                fontFamily: "'DM Sans', Helvetica, Arial, sans-serif",
                color: '#7a7c8a',
                fontSize: '12px',
                margin: 0,
              }}
            >
              You&apos;re receiving this because you created a song on Notevra.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

SongReadyEmail.PreviewProps = {
  recipientName: 'Sarah',
  listenUrl: 'https://example.com/listen/demo.mp3',
  downloadUrl: 'https://example.com/download/demo.mp3',
  genre: 'Jazz',
} satisfies SongReadyEmailProps;
