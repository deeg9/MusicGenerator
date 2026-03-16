import type { Metadata } from 'next';
import { DM_Sans, Libre_Baskerville, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CookieConsent } from '@/components/CookieConsent';
import { createClient } from '@/lib/supabase/server';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const libreBaskerville = Libre_Baskerville({
  variable: '--font-libre',
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Notevra',
  description: 'Turn your feelings into a song. Personalized AI music gifts, made with love.',
  openGraph: {
    title: 'Notevra',
    description: 'Turn your feelings into a song. Personalized AI music gifts, made with love.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Notevra' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Notevra',
    description: 'Turn your feelings into a song. Personalized AI music gifts, made with love.',
    images: ['/og-image.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${libreBaskerville.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <Header user={user} />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
