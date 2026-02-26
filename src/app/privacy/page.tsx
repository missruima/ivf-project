import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
              provide — age, AMH range, protocol type, medications, supplements,
              country/state, and outcomes. All of this is self-reported and anonymized.
            </p>
            <p>
              We also store a hashed version of your passphrase so you can
              return to update your record. The passphrase itself is never
              stored.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What we never collect</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>Names, emails, or any contact information</li>
              <li>IP addresses (used only transiently for rate limiting)</li>
              <li>Clinic or provider names</li>
              <li>Browser cookies or tracking identifiers</li>
              <li>None of the 18 HIPAA identifiers</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chat features</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              The research chat and protocol submission features are powered by
              Claude, Anthropic&apos;s AI assistant. Your chat messages are sent
              to Anthropic&apos;s API for processing. Anthropic&apos;s standard
              API data handling policies apply.
            </p>
            <p>
              We instruct Claude not to store, repeat, or make use of any
              personal information that may appear in messages. However, please
              avoid sharing identifying details in the chat.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data coarsening</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              To protect your privacy, we coarsen data where possible. AMH and
              AFC are stored as ranges. On the dashboard, ages are grouped into
              brackets (e.g., 35–37) rather than shown individually. We never
              show statistics for groups with fewer than 5 people, and we use
              k-anonymity principles to prevent re-identification through
              cross-tabulation.
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
