import type { Metadata } from 'next';
import { Bricolage_Grotesque, Figtree, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MusicGenerator',
  description: 'AI-powered music generation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bricolage.variable} ${figtree.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <div className="min-h-screen">
            <header className="flex justify-end p-4">
              <ThemeToggle />
            </header>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
