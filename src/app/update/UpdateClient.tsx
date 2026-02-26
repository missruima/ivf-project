'use client';

import { useState, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatInput } from '@/components/chat/ChatInput';
import { Disclaimer } from '@/components/shared/Disclaimer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DISCLAIMERS } from '@/lib/constants/disclaimers';
import { PROTOCOL_TYPE_LABELS, TRIGGER_TYPE_LABELS } from '@/lib/constants/ranges';
import type { ProtocolWithOutcome, ExtractedOutcomeData } from '@/types/protocol';

type Phase = 'lookup' | 'select' | 'review' | 'update' | 'done' | 'deleted';

export default function UpdateClient() {
  const [phase, setPhase] = useState<Phase>('lookup');
  const [passphrase, setPassphrase] = useState('');
  const [isLooking, setIsLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Multi-cycle state
  const [allProtocols, setAllProtocols] = useState<ProtocolWithOutcome[]>([]);
  const [record, setRecord] = useState<ProtocolWithOutcome | null>(null);

  const [extractedOutcome, setExtractedOutcome] = useState<ExtractedOutcomeData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteCycle = async () => {
    if (!passphrase.trim() || !record) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch('/api/protocol/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passphrase: passphrase.trim(),
          protocolId: record.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      if (!data.deleted) {
        setDeleteError('Could not delete. Please try again.');
        return;
      }

      // If there are other cycles, go back to selection
      const remaining = allProtocols.filter(p => p.id !== record.id);
      if (remaining.length > 0) {
        setAllProtocols(remaining);
        setRecord(null);
        setPhase('select');
      } else {
        setPhase('deleted');
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!passphrase.trim()) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch('/api/protocol/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: passphrase.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      if (!data.deleted) {
        setDeleteError('Could not delete. Please try again.');
        return;
      }

      setPhase('deleted');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLookup = async () => {
    if (!passphrase.trim()) return;
    setIsLooking(true);
    setLookupError(null);

    try {
      const res = await fetch('/api/protocol/lookup-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: passphrase.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Lookup failed');
      }

      if (!data.found || data.protocols.length === 0) {
        setLookupError('No matching record found. Please check your passphrase and try again.');
        return;
      }

      const protocols = data.protocols as ProtocolWithOutcome[];
      setAllProtocols(protocols);

      if (protocols.length === 1) {
        // Single protocol — go directly to review
        setRecord(protocols[0]);
        setPhase('review');
      } else {
        // Multiple protocols — show selection
        setPhase('select');
      }
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLooking(false);
    }
  };

  const handleExtractedData = useCallback((data: Record<string, unknown>) => {
    setExtractedOutcome((prev) => ({
      ...prev,
      ...(data as Partial<ExtractedOutcomeData>),
    } as ExtractedOutcomeData));
  }, []);

  const { messages, isStreaming, error, sendMessage, stopStreaming } = useChat({
    endpoint: '/api/outcome/extract',
    onExtractedData: handleExtractedData,
  });

  const handleSubmitOutcome = async () => {
    if (!extractedOutcome || !record) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/outcome/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passphrase: passphrase.trim(),
          protocolId: record.id,
          outcome: extractedOutcome,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Update failed');
      }

      setPhase('done');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phase: Lookup
  if (phase === 'lookup') {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">Update Your Outcomes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter the passphrase you received when you shared your protocol
          </p>
        </div>

        <Disclaimer text={DISCLAIMERS.outcome} variant="info" className="mb-6" />

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Your passphrase
              </label>
              <Input
                type="text"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="e.g., gentle-sunrise-bright-42"
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
            </div>

            {lookupError && (
              <p className="text-xs text-destructive">{lookupError}</p>
            )}

            <Button
              onClick={handleLookup}
              disabled={!passphrase.trim() || isLooking}
              className="w-full"
            >
              {isLooking ? 'Looking up...' : 'Find My Record'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase: Select (multi-cycle)
  if (phase === 'select') {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">Your Cycles</h1>
          <p className="text-muted-foreground text-sm mt-1">
            You have {allProtocols.length} cycle{allProtocols.length > 1 ? 's' : ''} on record — select one to update
          </p>
        </div>

        <div className="space-y-3">
          {allProtocols.map((protocol) => {
            const date = protocol.submittedAt
              ? new Date(protocol.submittedAt + 'Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              : '';
            const protocolLabel = protocol.protocolType ? (PROTOCOL_TYPE_LABELS[protocol.protocolType] || protocol.protocolType) : 'Unknown protocol';

            return (
              <Card
                key={protocol.id}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => { setRecord(protocol); setPhase('review'); }}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {protocol.cycleNumber ? `Cycle ${protocol.cycleNumber}` : 'Cycle'} — {protocolLabel}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Age {protocol.age} • {date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {protocol.outcome ? (
                        <Badge variant="secondary" className="text-[10px]">Has outcomes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">No outcomes</Badge>
                      )}
                      <span className="text-muted-foreground text-xs">→</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-muted-foreground hover:text-destructive text-xs">
                Delete all my data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all your data?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">
                    This will permanently remove all {allProtocols.length} cycle{allProtocols.length > 1 ? 's' : ''}, medications, and outcomes. This cannot be undone.
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Your passphrase will stop working after deletion.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && (
                <p className="text-xs text-destructive">{deleteError}</p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my data</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, delete everything'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  // Phase: Review existing record
  if (phase === 'review' && record) {
    const hasMultipleCycles = allProtocols.length > 1;

    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">
            {hasMultipleCycles
              ? `Cycle ${record.cycleNumber ?? ''}`.trim()
              : 'Your Protocol'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {hasMultipleCycles
              ? 'Review this cycle or update its outcomes'
              : 'Here is the protocol you shared'}
          </p>
        </div>

        {hasMultipleCycles && (
          <button
            onClick={() => { setRecord(null); setPhase('select'); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block"
          >
            ← Back to all cycles
          </button>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Saved Protocol</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Age" value={record.ageMonths != null ? `${record.age} yr ${record.ageMonths} mo` : String(record.age)} />
            {record.amhRange && <Row label="AMH" value={record.amhValue ? `${record.amhValue} ng/mL` : `${record.amhRange} ng/mL`} />}
            {record.afcRange && <Row label="AFC" value={record.afcCount ? String(record.afcCount) : record.afcRange} />}
            {record.country && <Row label="Location" value={record.state ? `${record.state}, ${record.country}` : record.country} />}
            {record.protocolType && <Row label="Protocol" value={PROTOCOL_TYPE_LABELS[record.protocolType] || record.protocolType} />}
            {record.triggerType && <Row label="Trigger" value={TRIGGER_TYPE_LABELS[record.triggerType] || record.triggerType} />}
            {record.stimDays && <Row label="Stim Days" value={String(record.stimDays)} />}
            {record.medications.filter(m => m.category !== 'supplement').length > 0 && (
              <Row label="Meds" value={record.medications.filter(m => m.category !== 'supplement').map(m => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`).join(', ')} />
            )}
            {record.medications.filter(m => m.category === 'supplement').length > 0 && (
              <Row label="Supplements" value={record.medications.filter(m => m.category === 'supplement').map(m => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`).join(', ')} />
            )}
          </CardContent>
        </Card>

        {record.outcome ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Current Outcomes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {record.outcome.eggsRetrieved != null && <Row label="Eggs Retrieved" value={String(record.outcome.eggsRetrieved)} />}
              {record.outcome.eggsMature != null && <Row label="Mature" value={String(record.outcome.eggsMature)} />}
              {record.outcome.eggsFertilized != null && <Row label="Fertilized" value={String(record.outcome.eggsFertilized)} />}
              {record.outcome.blastsDay5 != null && <Row label="Day 5 Blasts" value={String(record.outcome.blastsDay5)} />}
              {record.outcome.transferOutcome && <Row label="Transfer" value={record.outcome.transferOutcome.replace(/_/g, ' ')} />}
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-3">
          <Button onClick={() => setPhase('update')} className="w-full">
            {record.outcome ? 'Update Outcomes' : 'Add Outcomes'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive text-xs">
                {hasMultipleCycles ? 'Delete this cycle' : 'Delete my data'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {hasMultipleCycles ? 'Delete this cycle?' : 'Delete all your data?'}
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">
                    {hasMultipleCycles
                      ? 'This will permanently remove this cycle\'s protocol, medications, and outcomes. Your other cycles will not be affected.'
                      : 'This will permanently remove your protocol, medications, and any outcomes you have shared. This cannot be undone.'}
                  </span>
                  {!hasMultipleCycles && (
                    <span className="block text-xs text-muted-foreground">
                      Your passphrase will stop working after deletion.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && (
                <p className="text-xs text-destructive">{deleteError}</p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my data</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteCycle}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : hasMultipleCycles ? 'Yes, delete this cycle' : 'Yes, delete everything'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  // Phase: Update outcomes via chat
  if (phase === 'update') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-semibold">Share Your Outcomes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tell us how your cycle went — share as much or as little as you like
          </p>
        </div>

        <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden" style={{ height: 'min(60vh, 500px)' }}>
          <ChatWindow
            messages={messages}
            isStreaming={isStreaming}
            emptyState={
              <div className="text-center max-w-sm">
                <p className="text-3xl mb-3">🌸</p>
                <p className="text-sm font-medium text-foreground mb-1">
                  Welcome back
                </p>
                <p className="text-xs text-muted-foreground">
                  Tell us how your cycle went in your own words. Share whatever
                  you are comfortable with — every detail helps the community.
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

        {submitError && (
          <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {submitError}
          </div>
        )}

        <div className="mt-3 flex gap-3 items-end">
          <div className="flex-1">
            <ChatInput
              onSend={sendMessage}
              isStreaming={isStreaming}
              onStop={stopStreaming}
              placeholder="Tell us about your cycle outcomes..."
            />
          </div>
          {extractedOutcome?.isComplete && (
            <Button
              onClick={handleSubmitOutcome}
              disabled={isSubmitting}
              className="shrink-0 h-[44px]"
            >
              {isSubmitting ? 'Saving...' : 'Save Outcomes'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Phase: Deleted
  if (phase === 'deleted') {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-3xl mb-4">🕊️</p>
        <h2 className="text-xl font-semibold mb-2">Your data has been deleted</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Your protocol, medications, and outcomes have been permanently removed.
          Your passphrase is no longer active. Thank you for being part of this community,
          even if just for a while.
        </p>
        <Button asChild variant="outline">
          <a href="/">Return Home</a>
        </Button>
      </div>
    );
  }

  // Phase: Done
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center">
      <p className="text-3xl mb-4">🌸</p>
      <h2 className="text-xl font-semibold mb-2">Thank you for updating</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Your outcomes have been saved. Every update helps others understand the
        full range of possibilities.
      </p>
      <Button asChild>
        <a href="/dashboard">View Community Data</a>
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
