'use client';

import { useState, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatInput } from '@/components/chat/ChatInput';
import { ProtocolSummaryCard } from '@/components/protocol/ProtocolSummaryCard';
import { PassphraseDisplay } from '@/components/protocol/PassphraseDisplay';
import { Disclaimer } from '@/components/shared/Disclaimer';
import { Button } from '@/components/ui/button';
import { DISCLAIMERS } from '@/lib/constants/disclaimers';
import type { ExtractedProtocolData } from '@/types/protocol';

type Phase = 'chat' | 'confirm' | 'passphrase' | 'done';

export default function SharePage() {
  const [phase, setPhase] = useState<Phase>('chat');
  const [extractedData, setExtractedData] = useState<ExtractedProtocolData>({
    age: null,
    ageMonths: null,
    amhRange: null,
    amhValue: null,
    afcRange: null,
    afcCount: null,
    protocolType: null,
    medications: [],
    supplements: [],
    triggerType: null,
    stimDays: null,
    country: null,
    state: null,
    cycleNumber: null,
    cycleType: null,
    donorSperm: null,
    donorEggs: null,
    fertilizationMethod: null,
    partnerAge: null,
    peakE2: null,
    maxFollicles: null,
    diagnoses: [],
    isComplete: false,
    missingRequired: ['age', 'protocolType'],
  });
  const [passphrase, setPassphrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleExtractedData = useCallback((data: Record<string, unknown>) => {
    setExtractedData((prev) => ({
      ...prev,
      ...(data as Partial<ExtractedProtocolData>),
    }));
  }, []);

  const { messages, isStreaming, error, sendMessage, stopStreaming } = useChat({
    endpoint: '/api/protocol/extract',
    onExtractedData: handleExtractedData,
  });

  const handleSubmit = async () => {
    if (!extractedData.isComplete) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/protocol/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: extractedData.age,
          ageMonths: extractedData.ageMonths,
          amhRange: extractedData.amhRange,
          amhValue: extractedData.amhValue,
          afcRange: extractedData.afcRange,
          afcCount: extractedData.afcCount,
          protocolType: extractedData.protocolType,
          triggerType: extractedData.triggerType,
          stimDays: extractedData.stimDays,
          country: extractedData.country,
          state: extractedData.state,
          cycleNumber: extractedData.cycleNumber,
          cycleType: extractedData.cycleType,
          donorSperm: extractedData.donorSperm,
          donorEggs: extractedData.donorEggs,
          fertilizationMethod: extractedData.fertilizationMethod,
          partnerAge: extractedData.partnerAge,
          peakE2: extractedData.peakE2,
          maxFollicles: extractedData.maxFollicles,
          diagnoses: extractedData.diagnoses || [],
          medications: [
            ...extractedData.medications,
            ...(extractedData.supplements || []),
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Submission failed');
      }

      const result = await res.json();
      setPassphrase(result.passphrase);
      setPhase('passphrase');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (phase === 'passphrase') {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">Protocol Saved</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Thank you for sharing your experience
          </p>
        </div>
        <PassphraseDisplay
          passphrase={passphrase}
          onDone={() => setPhase('done')}
        />
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-3xl mb-4">🌸</p>
        <h2 className="text-xl font-semibold mb-2">Thank you</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Your protocol has been saved anonymously. When you have outcomes to
          share, come back with your passphrase to update your record.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" asChild>
            <a href="/dashboard">View Community Data</a>
          </Button>
          <Button asChild>
            <a href="/update">Update Outcomes</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-semibold">Share Your Protocol</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Describe your protocol in your own words — we will extract the details
        </p>
      </div>

      <Disclaimer text={DISCLAIMERS.protocol} variant="info" className="mb-4" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* Chat area */}
        <div className="flex flex-col">
          <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden" style={{ height: 'min(60vh, 500px)' }}>
            <ChatWindow
              messages={messages}
              isStreaming={isStreaming}
              emptyState={
                <div className="text-center max-w-sm">
                  <p className="text-3xl mb-3">💬</p>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Tell us about your protocol
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Just describe your IVF cycle in your own words — medications,
                    dosages, whatever you remember. We will ask follow-up questions
                    for anything we need.
                  </p>
                </div>
              }
            />
          </div>

          {error && (
            <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="mt-3 shrink-0">
            <ChatInput
              onSend={sendMessage}
              isStreaming={isStreaming}
              onStop={stopStreaming}
              placeholder="Describe your protocol..."
            />
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <ProtocolSummaryCard data={extractedData} />

          {extractedData.isComplete && (
            <div className="space-y-2">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Saving...' : 'Confirm & Submit'}
              </Button>
              {submitError && (
                <p className="text-xs text-destructive text-center">
                  {submitError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
