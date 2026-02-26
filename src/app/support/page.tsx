import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Support Us',
  description:
    'Help keep IVF Project free and running — see exactly what it costs and how to support the project.',
  openGraph: {
    title: 'Support Us | IVF Project',
    description:
      'Help keep IVF Project free and running — support the project.',
  },
  alternates: {
    canonical: '/support',
  },
};

const MONTHLY_COSTS = [
  { item: 'Server hosting', cost: '$12', note: 'VPS with persistent storage for the database' },
  { item: 'Domain (ivfproject.org)', cost: '$1', note: '~$12/year' },
  { item: 'AI chat (Claude API)', cost: '$20–150', note: 'Scales with usage — this is the biggest variable' },
  { item: 'PubMed research API', cost: 'Free', note: 'Public NCBI API' },
];

export default function SupportPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-8">
        <p className="text-3xl mb-3">🌷</p>
        <h1 className="text-2xl font-semibold">Help Keep This Running</h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">
          IVF Project is free, open source, and has no ads. It costs real money
          to keep it running. If this tool has been helpful, consider chipping in.
        </p>
      </div>

      <div className="space-y-6">
        {/* Cost transparency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What it costs to run</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              We believe in full transparency. Here is exactly what this site
              costs each month:
            </p>
            <div className="space-y-3">
              {MONTHLY_COSTS.map((row) => (
                <div key={row.item} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{row.item}</p>
                    <p className="text-xs text-muted-foreground">{row.note}</p>
                  </div>
                  <span className="text-sm font-mono font-medium text-foreground shrink-0">
                    {row.cost}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Estimated monthly total</p>
              <span className="text-sm font-mono font-semibold text-primary">$35–165</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              The AI chat cost scales with how many people use the site. More
              users = more conversations = higher API bills. Everything else is
              fixed.
            </p>
          </CardContent>
        </Card>

        {/* Donate */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Any amount helps. Even $5 covers roughly 50–150 chat conversations.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <a
                  href="https://ko-fi.com/ivfproject"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Donate on Ko-fi
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a
                  href="https://github.com/sponsors/ivfproject"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub Sponsors
                </a>
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              One-time or monthly — whatever feels right. No account needed for Ko-fi.
            </p>
          </CardContent>
        </Card>

        {/* What donations cover */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where the money goes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              100% of donations go directly to hosting and API costs. There are
              no salaries, no overhead, no middlemen. This is a volunteer project.
            </p>
            <p>
              If donations ever exceed costs, the surplus will be held for
              future months. If the project ever shuts down, any remaining funds
              will be donated to a fertility-related nonprofit.
            </p>
          </CardContent>
        </Card>

        {/* Other ways to help */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Other ways to help</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>Share your protocol — every data point helps the community</li>
              <li>Tell someone about ivfproject.org if you think it might help them</li>
              <li>Report bugs or suggest features on GitHub</li>
              <li>If you are a developer, contributions are welcome</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
