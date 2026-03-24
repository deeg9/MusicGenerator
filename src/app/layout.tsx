import type { Metadata } from 'next';
import { DM_Sans, Libre_Baskerville, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CookieConsent } from '@/components/CookieConsent';
import { TrackingScripts } from '@/components/TrackingScripts';
import { Analytics } from '@vercel/analytics/next';
import { PostHogProvider } from './providers';
import { PostHogPageView } from './PostHogPageView';
import { Suspense } from 'react';

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

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6" />
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${libreBaskerville.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <PostHogProvider>
          <PostHogPageView />
          <TrackingScripts />
          <Suspense fallback={<HeaderFallback />}>
            <Header />
          </Suspense>
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieConsent />
          <Analytics />
        </PostHogProvider>
      </body>
    </html>
  );
}
