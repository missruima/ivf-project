import type { Metadata } from 'next';
import ResearchClient from './ResearchClient';

export const metadata: Metadata = {
  title: 'IVF Explorer',
  description:
    'Use AI to navigate PubMed literature alongside aggregate data from 400+ community-shared IVF protocols.',
  openGraph: {
    title: 'IVF Explorer | IVF Project',
    description:
      'Use AI to navigate PubMed literature alongside aggregate community protocol data.',
  },
  alternates: {
    canonical: '/research',
  },
};

export default function ResearchPage() {
  return <ResearchClient />;
}
