import type { Metadata } from 'next';
import ShareClient from './ShareClient';

export const metadata: Metadata = {
  title: 'Share Your Protocol',
  description:
    'Anonymously share your IVF protocol through a simple chat — no accounts, no forms. Help others by contributing your experience.',
  openGraph: {
    title: 'Share Your Protocol | IVF Project',
    description:
      'Anonymously share your IVF protocol through a simple chat — no accounts, no forms.',
  },
  alternates: {
    canonical: '/share',
  },
};

export default function SharePage() {
  return <ShareClient />;
}
