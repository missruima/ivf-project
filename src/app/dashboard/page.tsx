import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Community Data',
  description:
    'Explore anonymized aggregate IVF outcomes by age, protocol type, and AMH range from 400+ community-reported cycles.',
  openGraph: {
    title: 'Community Data | IVF Project',
    description:
      'Explore anonymized aggregate IVF outcomes by age, protocol type, and AMH range from 400+ community-reported cycles.',
  },
  alternates: {
    canonical: '/dashboard',
  },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
