import type { Metadata } from 'next';
import { DM_Sans, Libre_Baskerville, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CookieConsent } from '@/components/CookieConsent';
import { Analytics } from '@vercel/analytics/next';
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
      <head>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '949118214118377');
            fbq('track', 'PageView');
          `}
        </Script>
      </head>
      <body className={`${dmSans.variable} ${libreBaskerville.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=949118214118377&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <Header user={user} />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  );
}
