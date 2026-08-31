import type { Metadata } from 'next';
import { Gabarito, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const gabarito = Gabarito({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Hedgehog — Clause review',
  description:
    'Clause review for due diligence. Every finding is quoted from the source contract and located by section.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${gabarito.variable} ${plexMono.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
