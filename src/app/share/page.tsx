import type { Metadata } from 'next';
import ShareClient from './ShareClient';

export const metadata: Metadata = {
  title: 'Share Your Protocol',
  description:
    'Share a pseudonymous IVF protocol through a simple chat — no account or form. Do not include direct identifiers.',
  openGraph: {
    title: 'Share Your Protocol | IVF Project',
    description:
      'Share a pseudonymous IVF protocol through a simple chat — no account or form.',
  },
  alternates: {
    canonical: '/share',
  },
};

export default function SharePage() {
  return <ShareClient />;
}
