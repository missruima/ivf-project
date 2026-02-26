import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'About',
  description:
    'About IVF Project — a free, open-source, community-driven IVF research and data tool. No ads, no tracking, no accounts.',
  openGraph: {
    title: 'About | IVF Project',
    description:
      'About IVF Project — a free, open-source, community-driven IVF research and data tool.',
  },
  alternates: {
    canonical: '/about',
  },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-semibold text-center mb-2">About IVF Project</h1>
      <p className="text-center text-muted-foreground mb-8">
        A community project, built with care
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Why this exists</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              IVF can feel like a black box. Protocols vary enormously between
              clinics and individuals, and it is hard to find objective,
              research-backed information that is not trying to sell you
              something.
            </p>
            <p>
              IVF Project was built because its creator — like many going through
              IVF — spent countless hours in forums trying to understand
              protocols, outcomes, and what the research actually says. This tool
              aims to make that information more accessible, more organized, and
              grounded in evidence.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What this is not</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>Not medical advice — always consult your fertility specialist</li>
              <li>Not a provider review site</li>
              <li>Not affiliated with any clinic, pharmacy, or company</li>
              <li>Not trying to predict your personal outcomes</li>
              <li>Not collecting your data for commercial purposes</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>IVF Explorer</strong> connects to PubMed — the largest
              database of biomedical research — and combines published studies
              with anonymized community data to answer your questions in plain
              language with citations.
            </p>
            <p>
              <strong>Protocol Sharing</strong> lets you describe your IVF
              protocol through a simple chat conversation. The AI extracts
              structured data (age, protocol type, medications, etc.) so
              it can be aggregated with others. No forms to fill out.
            </p>
            <p>
              <strong>Community Data</strong> shows aggregate statistics from
              anonymized, community-reported protocols. These are not clinical
              data — they are self-reported experiences shared to help others
              understand the range of possibilities.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Technology</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>Built with Next.js and TypeScript</li>
              <li>Research powered by PubMed E-utilities (free, public API)</li>
              <li>Chat powered by Claude (Anthropic)</li>
              <li>Data stored in SQLite — simple, no cloud dependencies</li>
              <li>No analytics, no tracking, no cookies</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
