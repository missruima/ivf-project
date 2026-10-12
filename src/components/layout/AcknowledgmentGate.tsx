'use client';

import { useSyncExternalStore } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const STORAGE_KEY = 'ivfproject-acknowledged';
const STORAGE_EVENT = 'ivfproject-acknowledgment-changed';

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function getSnapshot(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}

export function AcknowledgmentGate({ children }: { children: React.ReactNode }) {
  const acknowledged = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const handleAcknowledge = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
    window.dispatchEvent(new Event(STORAGE_EVENT));
  };

  // Already acknowledged — render the app
  if (acknowledged) {
    return <>{children}</>;
  }

  // Show acknowledgment screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 space-y-5">
          <div className="text-center">
            <p className="text-3xl mb-3">🌸</p>
            <h1 className="text-xl font-semibold text-foreground">
              Welcome to IVF Project
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              A free, open-source community tool for IVF research and
              protocol sharing
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-1">
              Important: This is not medical advice
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              IVF Project provides self-reported protocol data and AI-generated
              literature navigation for informational purposes only. Nothing
              here should replace guidance from your fertility specialist.
            </p>
          </div>

          <ul className="text-xs text-muted-foreground space-y-1.5 px-1">
            <li className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>Community data is self-reported and unverified</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>AI responses may be inaccurate or incomplete</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>Always consult your doctor before making treatment decisions</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>Submitted data is pseudonymous, not guaranteed anonymous</span>
            </li>
          </ul>

          <Button onClick={handleAcknowledge} className="w-full" size="lg">
            I understand — continue
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-foreground">
              Terms of Use
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Practices
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
