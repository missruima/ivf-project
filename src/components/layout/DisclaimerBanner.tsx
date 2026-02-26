'use client';

import { useState } from 'react';
import { DISCLAIMERS } from '@/lib/constants/disclaimers';

export function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-lavender/40 border-b border-lavender">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-start gap-3">
        <span className="text-sm mt-0.5 shrink-0" aria-hidden="true">
          ℹ️
        </span>
        <p className="text-xs text-foreground/80 flex-1">{DISCLAIMERS.general}</p>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground text-sm shrink-0 leading-none mt-0.5"
          aria-label="Dismiss disclaimer"
        >
          ×
        </button>
      </div>
    </div>
  );
}
