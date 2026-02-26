import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DisclaimerBanner } from '@/components/layout/DisclaimerBanner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'IVF Project — Community-Driven IVF Research & Data',
  description:
    'A privacy-first, open-source tool for understanding IVF. Access the latest research, share your protocol anonymously, and explore community-reported outcomes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <DisclaimerBanner />
        <Header />
        <main className="flex-1 min-h-0">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
