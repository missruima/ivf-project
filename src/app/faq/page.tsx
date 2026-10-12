import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about IVF Project — how it works, privacy, data accuracy, and more.',
  openGraph: {
    title: 'FAQ | IVF Project',
    description:
      'Frequently asked questions about IVF Project.',
  },
  alternates: {
    canonical: '/faq',
  },
};

const FAQS: { q: string; a: string | string[] }[] = [
  {
    q: 'What is IVF Project?',
    a: 'IVF Project is a free, open-source tool that helps people navigate published research, share protocols pseudonymously, and see aggregate community data — all in one place.',
  },
  {
    q: 'Is this medical advice?',
    a: 'No. IVF Project is an informational tool only. Nothing on this site constitutes medical advice, diagnosis, or treatment recommendations. Always consult your fertility specialist before making any treatment decisions.',
  },
  {
    q: 'How does IVF Explorer work?',
    a: 'IVF Explorer uses AI to help navigate PubMed search results and aggregate community protocol data. PubMed inclusion does not mean a paper has been endorsed or quality-rated, and an AI answer is not a verified evidence review. Check citations and discuss important claims with your clinician.',
  },
  {
    q: 'Is the AI always accurate?',
    a: [
      'AI-generated responses can sometimes be inaccurate, incomplete, or out of date. We do our best to ground answers in published research with citations, but you should always verify important information with your doctor.',
      'If you notice an error, please let us know at feedback@ivfproject.org.',
    ],
  },
  {
    q: 'How do I share my protocol?',
    a: 'Go to the Share page and have a quick chat conversation. The AI will ask about your protocol details — age, medications, dosages, supplements, etc. — and extract structured data from your answers. No forms to fill out. At the end, you will receive a passphrase to access your data later.',
  },
  {
    q: 'What is the passphrase for?',
    a: [
      'Your passphrase is the only way to access, update, or delete your submitted data. We do not collect emails or create accounts, so the passphrase is your key.',
      'Save it somewhere safe (email it to yourself, write it down, etc.). We cannot recover it if you lose it.',
    ],
  },
  {
    q: 'Can I submit multiple cycles with the same passphrase?',
    a: 'Yes! Most people do multiple retrievals, so we designed the system to support that. When you return to the Share page, choose "I\'ve shared before," enter your passphrase, and the system will use your most recent protocol as a starting point. Just tell the AI what changed.',
  },
  {
    q: 'What data do you collect?',
    a: [
      'The service stores sensitive clinical details you provide, including exact age, AMH/AFC, diagnoses, medications, country/state, donor information, protocol details, and outcomes. Records are pseudonymous, not guaranteed anonymous.',
      'We do not ask for names or emails and do not persist IP addresses, which are used transiently for rate limiting. Please do not put direct identifiers or clinic names into chat. There are no analytics or advertising trackers.',
    ],
  },
  {
    q: 'Can I delete my data?',
    a: 'Yes. Go to the Update page, enter your passphrase, and you can delete individual cycles or all of your data at once. Deletion is permanent and immediate.',
  },
  {
    q: 'How accurate is the community data?',
    a: [
      'Community data is entirely self-reported by pseudonymous users and has not been independently verified. It should be treated as anecdotal, not clinical evidence.',
      'Public results use coarse ranges and suppress filtered groups smaller than five. These measures reduce but do not eliminate re-identification risk.',
    ],
  },
  {
    q: 'Is this really free? What is the catch?',
    a: [
      'There is no catch. IVF Project is a volunteer project with no ads, no tracking, and no commercial agenda. It costs real money to run (server hosting, AI API costs), and we cover that through donations.',
      'If you find it helpful, consider supporting the project on our Support page. If donations fall short of operating costs, we may introduce small, non-intrusive ads in the future — but the core experience will always remain free.',
    ],
  },
  {
    q: 'I found a bug or have a feature idea. How do I report it?',
    a: 'Email us at feedback@ivfproject.org. We read every message. You do not need a technical background — just describe what happened or what you would like to see, and we will take it from there.',
  },
  {
    q: 'Is IVF Project open source?',
    a: 'Yes. The entire application is open source and available on GitHub. You can review exactly what data is collected, how it is stored, and how the AI is prompted. Contributions are welcome.',
  },
];

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-semibold text-center mb-2">
        Frequently Asked Questions
      </h1>
      <p className="text-center text-muted-foreground text-sm mb-8">
        Everything you need to know about IVF Project
      </p>

      <div className="space-y-4">
        {FAQS.map((faq) => (
          <Card key={faq.q}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{faq.q}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              {Array.isArray(faq.a) ? (
                faq.a.map((paragraph, i) => <p key={i}>{paragraph}</p>)
              ) : (
                <p>{faq.a}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-muted-foreground">
          Still have questions?{' '}
          <a
            href="mailto:feedback@ivfproject.org"
            className="text-primary hover:underline font-medium"
          >
            Send us an email
          </a>
        </p>
      </div>
    </div>
  );
}
