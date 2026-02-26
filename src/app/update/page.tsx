import type { Metadata } from 'next';
import UpdateClient from './UpdateClient';

export const metadata: Metadata = {
  title: 'Update Outcomes',
  description:
    'Return with your passphrase to add outcomes to your IVF protocol — eggs retrieved, fertilization, blastocysts, and transfer results.',
  openGraph: {
    title: 'Update Outcomes | IVF Project',
    description:
      'Return with your passphrase to add outcomes to your IVF protocol.',
  },
  alternates: {
    canonical: '/update',
  },
};

export default function UpdatePage() {
  return <UpdateClient />;
}
