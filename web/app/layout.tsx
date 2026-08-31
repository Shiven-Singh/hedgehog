import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hedgehog — Clause review',
  description:
    'Clause review for due diligence. Every finding is quoted from the source contract and located by section.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
