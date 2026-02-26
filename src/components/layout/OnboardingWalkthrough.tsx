'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'ivfproject-onboarding-done';

const STEPS = [
  {
    icon: '📚',
    title: 'Ask IVF Explorer',
    description:
      'Have questions about IVF? Ask anything and get answers grounded in published PubMed research and community data — with citations.',
    href: '/research',
  },
  {
    icon: '💬',
    title: 'Share Your Protocol',
    description:
      'Anonymously share your IVF protocol through a simple chat. No forms — just describe your cycle in your own words. Your data helps others.',
    href: '/share',
  },
  {
    icon: '📊',
    title: 'Community Data',
    description:
      'See aggregate outcomes from the community. Explore reported results by age group, protocol type, medications, and more.',
    href: '/dashboard',
  },
];

export function OnboardingWalkthrough() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        // Small delay so it doesn't clash with the AcknowledgmentGate
        const timer = setTimeout(() => setShow(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable — don't show
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
    setShow(false);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Card */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Skip button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-xs transition-colors"
          aria-label="Skip walkthrough"
        >
          Skip
        </button>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 bg-primary'
                  : i < step
                    ? 'w-1.5 bg-primary/40'
                    : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center space-y-3">
          <div className="text-4xl">{current.icon}</div>
          <h2 className="text-lg font-semibold text-foreground">
            {current.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 gap-3">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={prev}>
              Back
            </Button>
          ) : (
            <div />
          )}
          <Button size="sm" onClick={next}>
            {isLast ? 'Get Started' : 'Next'}
          </Button>
        </div>

        {/* Step count */}
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
