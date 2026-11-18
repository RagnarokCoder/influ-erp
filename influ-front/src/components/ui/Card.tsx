import React from 'react';

type CardVariant = 'default' | 'wash' | 'dark';
interface CardProps { variant?: CardVariant; className?: string; children: React.ReactNode; onClick?: () => void; }
export default function Card({ variant = 'default', className = '', children, onClick }: CardProps) {
  const v = { default: 'bg-white border-hairline', wash: 'bg-ice border-hairline', dark: 'bg-onyx border-smoke text-frost' };
  return <div onClick={onClick} className={`border rounded-[8px] ${v[variant]} ${className}`}>{children}</div>;
}
