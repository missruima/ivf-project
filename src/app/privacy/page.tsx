import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Privacy & Data Practices',
  description:
    'How IVF Project handles pseudonymous fertility data, AI chat messages, access passphrases, and aggregate reporting.',
  openGraph: {
    title: 'Privacy & Data Practices | IVF Project',
    description:
      'How IVF Project handles pseudonymous fertility data and AI chat messages.',
  },
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-semibold text-center mb-8">
        Privacy & Data Practices
      </h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What we collect</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              When you share a protocol, we store only the clinical details you
              provide — including exact age and age in months, AMH/AFC values or
              ranges, diagnoses, medications and doses, country/state, donor
              information, partner age, protocol details, and outcomes. This
              sensitive health data is self-reported and pseudonymous, not anonymous.
            </p>
            <p>
              We also store a hashed version of your passphrase so you can
              return to update your record. The passphrase itself is never
              stored.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">What we do not ask for</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>Names, emails, or any contact information</li>
              <li>IP addresses (used only transiently for rate limiting)</li>
              <li>Clinic or provider names</li>
              <li>Browser cookies or tracking identifiers</li>
              <li>Direct identifiers such as names, email addresses, phone numbers, or street addresses</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chat features</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              The IVF Explorer and protocol submission features are powered by
              Claude, Anthropic&apos;s AI assistant. Your chat messages are sent
              to Anthropic&apos;s API for processing. Anthropic&apos;s standard
              API data handling policies apply.
            </p>
            <p>
              Research questions are also sent to PubMed to locate papers. We do
              not retain live research questions in our response cache. Please
              do not put names, contact details, clinic names, or other direct
              identifiers into any chat.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aggregation and remaining risk</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Public statistics use age and clinical-data ranges, and filtered
              cohorts smaller than five are suppressed. These controls reduce
              risk but cannot guarantee anonymity: combinations of age,
              location, rare diagnoses, and treatment details may still make a
              person recognizable. IVF Project has not made a HIPAA Safe Harbor
              or Expert Determination de-identification claim. See the{' '}
              <a className="underline" href="https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html">HHS de-identification guidance</a>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deleting your data</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              If you want your record removed, enter your passphrase on the
              Update page and request deletion. Since we have no way to contact
              you, the passphrase is the only way to identify your record.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open source</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              This entire application is open source. You can review exactly
              what data is collected, how it is stored, and how it is used by
              examining the source code.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
