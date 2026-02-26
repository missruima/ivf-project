import type { Metadata } from 'next';
import ResearchClient from './ResearchClient';

export const metadata: Metadata = {
  title: 'IVF Explorer',
  description:
    'Ask IVF questions — answers combine PubMed research with community-reported data from 400+ cycles.',
  openGraph: {
    title: 'IVF Explorer | IVF Project',
    description:
      'Ask IVF questions — answers combine PubMed research with community-reported data from 400+ cycles.',
  },
  alternates: {
    canonical: '/research',
  },
};

export default function ResearchPage() {
  return <ResearchClient />;
}
