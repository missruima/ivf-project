'use client';

import { useState, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatInput } from '@/components/chat/ChatInput';
import { ProtocolSummaryCard } from '@/components/protocol/ProtocolSummaryCard';
import { Disclaimer } from '@/components/shared/Disclaimer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DISCLAIMERS } from '@/lib/constants/disclaimers';
import { PROTOCOL_TYPE_LABELS, TRIGGER_TYPE_LABELS } from '@/lib/constants/ranges';
import type { ProtocolWithOutcome, ExtractedOutcomeData } from '@/types/protocol';

type Phase = 'lookup' | 'review' | 'update' | 'done' | 'deleted';

export default function UpdatePage() {
  const [phase, setPhase] = useState<Phase>('lookup');
  const [passphrase, setPassphrase] = useState('');
  const [isLooking, setIsLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [record, setRecord] = useState<ProtocolWithOutcome | null>(null);
  const [extractedOutcome, setExtractedOutcome] = useState<ExtractedOutcomeData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
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
      const res = await fetch('/api/protocol/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: passphrase.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Lookup failed');
      }

      if (!data.found) {
        setLookupError('No matching record found. Please check your passphrase and try again.');
        return;
      }

      setRecord(data.protocol);
      setPhase('review');
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

    try {
      const res = await fetch('/api/outcome/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passphrase: passphrase.trim(),
          outcome: extractedOutcome,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Update failed');
      }

      setPhase('done');
    } catch {
      // Show error in chat
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

  // Phase: Review existing record
  if (phase === 'review' && record) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">Your Protocol</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here is the protocol you shared
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Saved Protocol</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Age" value={record.ageMonths != null ? `${record.age} yr ${record.ageMonths} mo` : String(record.age)} />
            {record.amhRange && <Row label="AMH" value={`${record.amhRange} ng/mL`} />}
            {record.afcRange && <Row label="AFC" value={record.afcRange} />}
            {record.country && <Row label="Location" value={record.state ? `${record.state}, ${record.country}` : record.country} />}
            <Row label="Protocol" value={PROTOCOL_TYPE_LABELS[record.protocolType] || record.protocolType} />
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
                Delete my data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all your data?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">
                    This will permanently remove your protocol, medications, and any outcomes
                    you have shared. This cannot be undone.
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
                  onClick={handleDelete}
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
