import { cn } from '@/lib/utils';

interface DisclaimerProps {
  text: string;
  variant?: 'info' | 'warning' | 'subtle';
  className?: string;
}

export function Disclaimer({ text, variant = 'info', className }: DisclaimerProps) {
  return (
    <div
      className={cn(
        'rounded-lg px-4 py-3 text-xs leading-relaxed',
        variant === 'info' && 'bg-lavender/30 text-foreground/70',
        variant === 'warning' && 'bg-soft-gold/30 text-foreground/80',
        variant === 'subtle' && 'text-muted-foreground',
        className
      )}
    >
      {text}
    </div>
  );
}
