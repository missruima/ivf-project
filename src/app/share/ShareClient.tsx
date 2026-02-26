'use client';

import { useState, useCallback, useMemo } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatInput } from '@/components/chat/ChatInput';
import { ProtocolSummaryCard } from '@/components/protocol/ProtocolSummaryCard';
import { PassphraseDisplay } from '@/components/protocol/PassphraseDisplay';
import { Disclaimer } from '@/components/shared/Disclaimer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DISCLAIMERS } from '@/lib/constants/disclaimers';
import { PROTOCOL_TYPE_LABELS } from '@/lib/constants/ranges';
import type { ExtractedProtocolData, ProtocolWithOutcome, Medication } from '@/types/protocol';

type Phase = 'welcome' | 'lookup' | 'chat' | 'confirm' | 'passphrase' | 'done';

const emptyExtractedData: ExtractedProtocolData = {
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
  canSubmit: false,
  isComplete: false,
  missingRequired: ['age', 'protocolType'],
};

/**
 * Convert a stored Protocol (from DB) into an ExtractedProtocolData shape
 * so the chat and summary card can pre-populate.
 */
function protocolToExtracted(protocol: ProtocolWithOutcome, nextCycleNumber: number): ExtractedProtocolData {
  const stims: Medication[] = [];
  const supps: Medication[] = [];
  for (const med of protocol.medications) {
    if (med.category === 'supplement') {
      supps.push(med);
    } else {
      stims.push(med);
    }
  }

  return {
    age: protocol.age,
    ageMonths: protocol.ageMonths,
    amhRange: protocol.amhRange,
    amhValue: protocol.amhValue,
    afcRange: protocol.afcRange,
    afcCount: protocol.afcCount,
    protocolType: protocol.protocolType,
    medications: stims,
    supplements: supps,
    triggerType: protocol.triggerType,
    stimDays: protocol.stimDays,
    country: protocol.country,
    state: protocol.state,
    cycleNumber: nextCycleNumber,
    cycleType: protocol.cycleType,
    donorSperm: protocol.donorSperm,
    donorEggs: protocol.donorEggs,
    fertilizationMethod: protocol.fertilizationMethod,
    partnerAge: protocol.partnerAge,
    peakE2: protocol.peakE2,
    maxFollicles: protocol.maxFollicles,
    diagnoses: protocol.diagnoses,
    canSubmit: !!(protocol.age && (stims.length > 0 || supps.length > 0)),
    isComplete: !!(protocol.age && protocol.protocolType),
    missingRequired: [],
  };
}

export default function ShareClient() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [extractedData, setExtractedData] = useState<ExtractedProtocolData>(emptyExtractedData);
  const [passphrase, setPassphrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Returning user state
  const [existingPassphrase, setExistingPassphrase] = useState('');
  const [isLooking, setIsLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [previousProtocol, setPreviousProtocol] = useState<ProtocolWithOutcome | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);

  const handleExtractedData = useCallback((data: Record<string, unknown>) => {
    setExtractedData((prev) => ({
      ...prev,
      ...(data as Partial<ExtractedProtocolData>),
    }));
  }, []);

  // Build extraBody for returning users
  const chatExtraBody = useMemo(() => {
    if (!previousProtocol) return undefined;
    return {
      previousProtocol: {
        age: previousProtocol.age,
        protocolType: previousProtocol.protocolType,
        cycleNumber: previousProtocol.cycleNumber,
        triggerType: previousProtocol.triggerType,
        stimDays: previousProtocol.stimDays,
        medications: previousProtocol.medications.filter(m => m.category !== 'supplement').map(m => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`),
        supplements: previousProtocol.medications.filter(m => m.category === 'supplement').map(m => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`),
        diagnoses: previousProtocol.diagnoses,
        amhValue: previousProtocol.amhValue,
        afcCount: previousProtocol.afcCount,
        country: previousProtocol.country,
        state: previousProtocol.state,
        cycleType: previousProtocol.cycleType,
        fertilizationMethod: previousProtocol.fertilizationMethod,
      },
    };
  }, [previousProtocol]);

  const { messages, isStreaming, error, sendMessage, stopStreaming } = useChat({
    endpoint: '/api/protocol/extract',
    onExtractedData: handleExtractedData,
    extraBody: chatExtraBody,
  });

  // Handle passphrase lookup for returning users
  const handleLookup = async () => {
    if (!existingPassphrase.trim()) return;
    setIsLooking(true);
    setLookupError(null);

    try {
      const res = await fetch('/api/protocol/lookup-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: existingPassphrase.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Lookup failed');
      }

      if (!data.found || data.protocols.length === 0) {
        setLookupError('No matching record found. Please check your passphrase and try again.');
        return;
      }

      // Use the most recent protocol as the template
      const mostRecent = data.protocols[0] as ProtocolWithOutcome;
      setPreviousProtocol(mostRecent);
      setIsReturningUser(true);

      // Pre-populate extracted data from previous protocol
      const nextCycleNum = Math.max(mostRecent.cycleNumber ?? 0, data.protocols.length) + 1;
      setExtractedData(protocolToExtracted(mostRecent, nextCycleNum));

      setPhase('chat');
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLooking(false);
    }
  };

  // canSubmit = minimum data threshold: age + at least one medication
  const canSubmit = extractedData.age != null
    && (extractedData.medications.length > 0 || (extractedData.supplements?.length ?? 0) > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const body: Record<string, unknown> = {
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
        ].map((med) => ({
          name: med.name || '',
          dosage: med.dosage ?? '',
          category: med.category || 'stim',
        })).filter((med) => med.name.trim() !== ''),
      };

      // If returning user, include their passphrase for linking
      if (isReturningUser && existingPassphrase.trim()) {
        body.existingPassphrase = existingPassphrase.trim();
      }

      const res = await fetch('/api/protocol/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err.details?.[0]?.message;
        throw new Error(detail ? `${err.error} ${detail}` : (err.error || 'Submission failed'));
      }

      const result = await res.json();

      if (result.isReturningUser) {
        // Returning user — skip passphrase display, go to done
        setPhase('done');
      } else {
        // New user — show passphrase
        setPassphrase(result.passphrase);
        setPhase('passphrase');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Intercept "submit" / "confirm" typed in chat
  const handleChatSend = useCallback(
    (content: string) => {
      const trimmed = content.trim().toLowerCase();
      if ((trimmed === 'submit' || trimmed === 'confirm') && canSubmit && !isSubmitting) {
        handleSubmit();
        return;
      }
      sendMessage(content);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canSubmit, isSubmitting, sendMessage]
  );

  // ─── Phase: Welcome ────────────────────────────────────────
  if (phase === 'welcome') {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">Share Your Protocol</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Help others by anonymously sharing your IVF cycle details
          </p>
        </div>

        <Disclaimer text={DISCLAIMERS.protocol} variant="info" className="mb-6" />

        <div className="space-y-3">
          <Card
            className="cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => setPhase('chat')}
          >
            <CardContent className="pt-6 pb-5 text-center">
              <p className="text-3xl mb-2">💬</p>
              <p className="font-medium text-foreground">First time sharing</p>
              <p className="text-xs text-muted-foreground mt-1">
                Describe your protocol in your own words
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => setPhase('lookup')}
          >
            <CardContent className="pt-6 pb-5 text-center">
              <p className="text-3xl mb-2">🔄</p>
              <p className="font-medium text-foreground">I&apos;ve shared before</p>
              <p className="text-xs text-muted-foreground mt-1">
                Enter your passphrase to add another cycle
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Phase: Lookup (returning user passphrase entry) ───────
  if (phase === 'lookup') {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">Welcome Back</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter the passphrase from your previous submission
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Your passphrase
              </label>
              <Input
                type="text"
                value={existingPassphrase}
                onChange={(e) => setExistingPassphrase(e.target.value)}
                placeholder="e.g., gentle-sunrise-bright-42"
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
            </div>

            {lookupError && (
              <p className="text-xs text-destructive">{lookupError}</p>
            )}

            <Button
              onClick={handleLookup}
              disabled={!existingPassphrase.trim() || isLooking}
              className="w-full"
            >
              {isLooking ? 'Looking up...' : 'Find My Protocols'}
            </Button>

            <button
              onClick={() => { setPhase('welcome'); setLookupError(null); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
            >
              ← Back
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Phase: Passphrase display (new user only) ─────────────
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

  // ─── Phase: Done ───────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-3xl mb-4">🌸</p>
        <h2 className="text-xl font-semibold mb-2">
          {isReturningUser ? 'Cycle Saved!' : 'Thank you'}
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          {isReturningUser
            ? 'Your new cycle has been linked to your existing passphrase. When you have outcomes, come back to the Update page to add them.'
            : 'Your protocol has been saved anonymously. When you have outcomes to share, come back with your passphrase to update your record.'}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button variant="outline" asChild>
            <a href="/dashboard">View Community Data</a>
          </Button>
          <Button asChild>
            <a href="/update">Update Outcomes</a>
          </Button>
          {isReturningUser && (
            <Button
              variant="outline"
              onClick={() => {
                // Reset for another cycle
                setPreviousProtocol(null);
                setExtractedData(emptyExtractedData);
                setSubmitError(null);
                setPhase('welcome');
              }}
            >
              Share Another Cycle
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Phase: Chat ───────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-semibold">
          {isReturningUser ? 'Share Another Cycle' : 'Share Your Protocol'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isReturningUser
            ? 'Adding to your history — tell us what changed from your last cycle'
            : 'Describe your protocol in your own words — we will extract the details'}
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
                  <p className="text-3xl mb-3">{isReturningUser ? '🔄' : '💬'}</p>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {isReturningUser
                      ? `Welcome back! Your last cycle was ${PROTOCOL_TYPE_LABELS[previousProtocol?.protocolType ?? ''] || 'unknown'} at age ${previousProtocol?.age ?? '?'}.`
                      : 'Tell us about your protocol'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isReturningUser
                      ? 'Tell us what changed this cycle — meds, dosages, protocol type, or anything else. We\'ll keep everything the same unless you say otherwise.'
                      : 'Just describe your IVF cycle in your own words — medications, dosages, whatever you remember. We will ask follow-up questions for anything we need.'}
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

          {/* Inline submit button — visible when can submit, critical for mobile */}
          {canSubmit && (
            <div className="mt-3">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300"
                size="lg"
              >
                {isSubmitting
                  ? 'Saving...'
                  : extractedData.isComplete
                    ? '✓ Confirm & Submit'
                    : 'Submit What You Have'}
              </Button>
              {!extractedData.isComplete && (
                <p className="text-[10px] text-muted-foreground text-center mt-1">
                  You can return later with your passphrase to add more details
                </p>
              )}
              {submitError && (
                <p className="text-xs text-destructive text-center mt-1">
                  {submitError}
                </p>
              )}
            </div>
          )}
          {/* Gentle message when not enough data yet */}
          {!canSubmit && messages.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 text-center">
              To submit, we need at least your <strong>age</strong> and <strong>one medication</strong>.
              Other helpful details: protocol type, AMH, trigger, stim days.
            </div>
          )}

          <div className="mt-3 shrink-0">
            <ChatInput
              onSend={handleChatSend}
              isStreaming={isStreaming}
              onStop={stopStreaming}
              placeholder={isReturningUser ? 'Tell us what changed...' : 'Describe your protocol...'}
            />
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <ProtocolSummaryCard data={extractedData} />

          {canSubmit && (
            <div className="space-y-2 hidden lg:block">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting
                  ? 'Saving...'
                  : extractedData.isComplete
                    ? 'Confirm & Submit'
                    : 'Submit What You Have'}
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
