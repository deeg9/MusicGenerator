import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Font,
  Preview,
} from '@react-email/components';
import React from 'react';

interface GiftDeliveryEmailProps {
  recipientName: string;
  creatorFirstName: string;
  relationship: string;
  message: string;
  genre: string;
  listenUrl: string;
}

export function GiftDeliveryEmail({
  recipientName,
  creatorFirstName,
  relationship,
  message,
  genre,
  listenUrl,
}: GiftDeliveryEmailProps) {
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
      <Preview>A one-of-a-kind song, made just for {recipientName}.</Preview>
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
                fontSize: '22px',
                fontWeight: 700,
                margin: '0 0 8px 0',
              }}
            >
              Someone made a song just for you
            </Heading>

            <Text
              style={{
                fontFamily: "'DM Sans', Helvetica, Arial, sans-serif",
                color: '#7a7c8a',
                fontSize: '14px',
                margin: '0 0 20px 0',
              }}
            >
              From your {relationship}, {creatorFirstName}
            </Text>

            <Hr
              style={{
                borderColor: '#a8c8e0',
                borderTopWidth: '1px',
                margin: '0 0 20px 0',
              }}
            />

            {/* Personal message quote block */}
            <Section
              style={{
                borderLeft: '3px solid #6ba3c9',
                paddingLeft: '16px',
                marginBottom: '20px',
              }}
            >
              <Text
                style={{
                  fontFamily: "'DM Sans', Helvetica, Arial, sans-serif",
                  color: '#2d2e38',
                  fontSize: '15px',
                  fontStyle: 'italic',
                  lineHeight: '1.6',
                  margin: 0,
                }}
              >
                {message}
              </Text>
            </Section>

            <Hr
              style={{
                borderColor: '#a8c8e0',
                borderTopWidth: '1px',
                margin: '0 0 20px 0',
              }}
            />

            <Text
              style={{
                fontFamily: "'DM Sans', Helvetica, Arial, sans-serif",
                color: '#7a7c8a',
                fontSize: '13px',
                margin: '0 0 24px 0',
              }}
            >
              A {genre} song, made just for you
            </Text>

            <Button
              href={listenUrl}
              style={{
                backgroundColor: '#6ba3c9',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '14px 28px',
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'block',
                textAlign: 'center',
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: '12px',
              }}
            >
              Listen to Your Song
            </Button>

            <Text
              style={{
                fontFamily: "'DM Sans', Helvetica, Arial, sans-serif",
                color: '#7a7c8a',
                fontSize: '12px',
                textAlign: 'center',
                margin: 0,
              }}
            >
              No account required · Private link · No marketing
            </Text>
          </Section>

          {/* Footer section */}
          <Section style={{ padding: '24px 32px' }}>
            <Text
              style={{
                fontFamily: "'DM Sans', Helvetica, Arial, sans-serif",
                color: '#7a7c8a',
                fontSize: '12px',
                margin: 0,
              }}
            >
              noreply@notevra.com · notevra.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

GiftDeliveryEmail.PreviewProps = {
  recipientName: 'Alex',
  creatorFirstName: 'Jordan',
  relationship: 'friend',
  message: 'I wanted to give you something special to celebrate your birthday!',
  genre: 'Pop',
  listenUrl: 'https://example.com/listen/demo.mp3',
} satisfies GiftDeliveryEmailProps;
