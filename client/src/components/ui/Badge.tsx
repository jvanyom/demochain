import type { HTMLAttributes } from 'react';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  neutral: 'bg-surface text-muted border-border',
  primary: 'bg-primary/10 text-primary border-primary/30',
  success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  danger: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
};

export function Badge({ tone = 'neutral', className = '', ...rest }: Props) {
  return (
    <span
      {...rest}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}
    />
  );
}
