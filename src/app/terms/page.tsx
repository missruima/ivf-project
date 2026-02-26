import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-semibold text-center mb-2">Terms of Use</h1>
      <p className="text-center text-muted-foreground text-sm mb-8">
        Last updated: February 2026
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Not medical advice</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              IVF Project is an informational tool only. Nothing on this site
              constitutes medical advice, diagnosis, or treatment
              recommendations. The information provided — including research
              summaries, community-reported data, and AI-generated responses —
              is for general educational purposes only.
            </p>
            <p>
              <strong>
                Always consult a qualified fertility specialist or healthcare
                provider before making any decisions about your treatment.
              </strong>{' '}
              Do not disregard professional medical advice or delay seeking it
              because of something you read on this site.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. No warranties</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              This site is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without warranties of any kind, either express or
              implied. We do not guarantee the accuracy, completeness, or
              reliability of any information on this site.
            </p>
            <p>
              Community-reported data is self-reported by anonymous users and has
              not been independently verified. Research summaries are generated
              by AI and may contain errors or omissions. Published research
              citations link to PubMed but we do not control or endorse the
              content of those papers.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Limitation of liability</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              To the fullest extent permitted by law, IVF Project and its
              creators, contributors, and operators shall not be liable for any
              direct, indirect, incidental, consequential, or punitive damages
              arising from your use of or inability to use this site, including
              but not limited to decisions made based on information obtained
              from this site.
            </p>
            <p>
              You use this site entirely at your own risk.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">4. User-submitted data</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              When you share a protocol or outcome, you grant IVF Project a
              perpetual, non-exclusive license to store, aggregate, and display
              that data in anonymized form. You may delete your data at any time
              using your passphrase.
            </p>
            <p>
              You represent that any information you submit is truthful to the
              best of your knowledge. You agree not to submit intentionally
              misleading data, as it could affect the quality of community
              statistics that others rely on.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">5. AI-generated content</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              This site uses AI (Claude by Anthropic) to power chat features
              including research explanations, protocol extraction, and outcome
              recording. AI-generated content may be inaccurate, incomplete, or
              out of date.
            </p>
            <p>
              AI responses should not be treated as factual statements or
              medical guidance. They are best understood as a starting point for
              further discussion with your healthcare provider.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">6. Privacy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Our privacy practices are described on our{' '}
              <a href="/privacy" className="underline hover:text-foreground">
                Privacy &amp; Data Practices
              </a>{' '}
              page. By using this site, you acknowledge and agree to those
              practices.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">7. Changes to these terms</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              We may update these terms from time to time. Continued use of the
              site after changes are posted constitutes acceptance of the
              updated terms. The &ldquo;last updated&rdquo; date at the top of
              this page indicates when these terms were most recently revised.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">8. Open source</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              This application is open source. The source code is publicly
              available for review. The software is provided without warranty,
              and contributors are not liable for its use. If you deploy your
              own instance, these terms apply only to ivfproject.org.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
