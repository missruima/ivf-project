'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DISCLAIMERS } from '@/lib/constants/disclaimers';

interface PassphraseDisplayProps {
  passphrase: string;
  onDone: () => void;
}

export function PassphraseDisplay({ passphrase, onDone }: PassphraseDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(passphrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
    }
  };

  const mailtoHref = `mailto:?subject=${encodeURIComponent(
    'My IVF Project Passphrase'
  )}&body=${encodeURIComponent(
    `Here is my IVF Project passphrase — I'll need this to update my outcomes later.\n\n${passphrase}\n\nKeep this email somewhere safe. This passphrase cannot be recovered if lost.`
  )}`;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base text-center">
          Your passphrase has been created
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Passphrase display */}
        <div className="bg-card rounded-lg border-2 border-dashed border-primary/30 p-6 text-center">
          <p className="text-2xl font-mono font-bold tracking-wide text-foreground">
            {passphrase}
          </p>
        </div>

        {/* Copy + Email buttons */}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={mailtoHref}>
              Email to myself
            </a>
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Email opens your own mail app — we never see your address
        </p>

        {/* Warning */}
        <div className="bg-soft-gold/30 rounded-lg px-4 py-3">
          <p className="text-sm font-medium text-foreground mb-1">
            Please save this passphrase
          </p>
          <p className="text-xs text-muted-foreground">
            {DISCLAIMERS.passphrase}
          </p>
        </div>

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 accent-primary"
          />
          <span className="text-sm text-muted-foreground">
            I have saved my passphrase somewhere safe
          </span>
        </label>

        <Button
          onClick={onDone}
          disabled={!confirmed}
          className="w-full"
        >
          Done
        </Button>
      </CardContent>
    </Card>
  );
}
