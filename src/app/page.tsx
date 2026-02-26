import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const features = [
  {
    href: '/research',
    title: 'IVF Explorer',
    description:
      'Ask questions about IVF and get answers from published research and community data, with paper citations.',
    icon: '📚',
  },
  {
    href: '/share',
    title: 'Share Your Protocol',
    description:
      'Anonymously share your IVF protocol through a simple conversation. No forms, no accounts, no identifying information.',
    icon: '💬',
  },
  {
    href: '/dashboard',
    title: 'Community Data',
    description:
      'Explore anonymized, aggregate outcomes from the community. See reported results by age, protocol type, and more.',
    icon: '📊',
  },
];

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Hero */}
      <section className="py-16 sm:py-24 text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          Understanding your IVF journey,{' '}
          <span className="text-primary">together</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          A free, open-source tool built by the community, for the community.
          Access the latest research, share your experience anonymously, and
          explore what others have reported.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/research">Explore IVF Explorer</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/share">Share Your Protocol</Link>
          </Button>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="pb-16 grid gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href} className="group">
            <Card className="h-full transition-all group-hover:shadow-md group-hover:border-primary/20">
              <CardHeader>
                <div className="text-3xl mb-2">{feature.icon}</div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      {/* Trust Signals */}
      <section className="pb-16">
        <div className="rounded-xl bg-muted/50 border border-border/50 px-6 py-8 text-center">
          <h2 className="text-lg font-medium text-foreground mb-6">
            Built with privacy at the core
          </h2>
          <div className="grid gap-6 sm:grid-cols-4">
            <TrustSignal icon="🔒" text="No accounts or emails" />
            <TrustSignal icon="👤" text="Fully anonymized data" />
            <TrustSignal icon="🚫" text="No ads or tracking" />
            <TrustSignal icon="💻" text="100% open source" />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="pb-20">
        <h2 className="text-lg font-medium text-foreground text-center mb-8">
          How sharing works
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Step
            number={1}
            title="Describe your protocol"
            description="Tell us about your cycle in your own words through a simple chat. No medical forms to fill out."
          />
          <Step
            number={2}
            title="Get your passphrase"
            description="We give you a random passphrase — your only key to return later. No email, no login."
          />
          <Step
            number={3}
            title="Come back to update"
            description="After your cycle, return with your passphrase to add your outcomes. Every update helps the community."
          />
        </div>
      </section>
    </div>
  );
}

function TrustSignal({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-2xl">{icon}</span>
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <Card className="text-center">
      <CardContent className="pt-6">
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center mx-auto mb-3">
          {number}
        </div>
        <h3 className="font-medium text-sm mb-2">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
