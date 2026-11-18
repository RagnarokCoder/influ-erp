import React from 'react';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'blue';
interface BadgeProps { tone?: Tone; dot?: boolean; children: React.ReactNode; className?: string; }

const tones: Record<Tone, string> = {
  success: 'bg-success-wash text-success',
  warning: 'bg-warning-wash text-warning',
  danger:  'bg-danger-wash text-danger',
  neutral: 'bg-pebble text-smoke',
  blue:    'bg-ice text-blue-link',
};

export default function Badge({ tone = 'neutral', dot, children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full ${tones[tone]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
