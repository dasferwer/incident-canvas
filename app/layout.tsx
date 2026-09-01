import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';
import { Providers } from './providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'cyrillic'],
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin', 'cyrillic'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.INCIDENT_CANVAS_SITE_URL ?? 'http://localhost:8070',
  ),
  title: 'IncidentCanvas — real-time incident command center',
  description:
    'Интерактивный frontend для анализа инцидентов, зависимостей и live logs.',
  openGraph: {
    title: 'IncidentCanvas',
    description: 'Real-time incident command center',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IncidentCanvas',
    description: 'Real-time incident command center',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
