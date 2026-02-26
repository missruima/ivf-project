import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DisclaimerBanner } from '@/components/layout/DisclaimerBanner';
import { AcknowledgmentGate } from '@/components/layout/AcknowledgmentGate';
import { OnboardingWalkthrough } from '@/components/layout/OnboardingWalkthrough';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const SITE_URL = 'https://ivfproject.org';
const SITE_NAME = 'IVF Project';
const DEFAULT_DESCRIPTION =
  'A free, open-source, privacy-first tool for understanding IVF. Access PubMed research, share your protocol anonymously, and explore community-reported outcomes from 400+ cycles.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s | IVF Project',
    default: 'IVF Project — Community-Driven IVF Research & Data',
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    'IVF', 'in vitro fertilization', 'IVF research', 'IVF outcomes',
    'IVF protocol', 'fertility treatment', 'egg retrieval', 'embryo transfer',
    'IVF community data', 'PubMed IVF', 'IVF statistics', 'AMH',
    'blastocyst', 'PGT testing', 'IVF success rates', 'fertility data',
    'IVF cycle data', 'reproductive medicine', 'assisted reproduction',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    title: 'IVF Project — Community-Driven IVF Research & Data',
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IVF Project — Community-Driven IVF Research & Data',
    description: DEFAULT_DESCRIPTION,
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION,
    },
    {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      description:
        'A non-profit, open-source project providing evidence-based IVF research tools and anonymized community data to help people understand fertility treatments.',
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <AcknowledgmentGate>
          <OnboardingWalkthrough />
          <DisclaimerBanner />
          <Header />
          <main className="flex-1 min-h-0">{children}</main>
          <Footer />
        </AcknowledgmentGate>
      </body>
    </html>
  );
}
