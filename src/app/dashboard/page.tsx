import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Community Data',
  description:
    'Explore aggregate data from 400+ pseudonymous, community-shared IVF protocols. Outcome measures are not currently published.',
  openGraph: {
    title: 'Community Data | IVF Project',
    description:
      'Explore aggregate community-shared IVF protocol data.',
  },
  alternates: {
    canonical: '/dashboard',
  },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
