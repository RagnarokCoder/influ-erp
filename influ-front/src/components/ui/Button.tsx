import React from 'react';

type Variant = 'filled' | 'outlined' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
}

export default function Button({ variant = 'filled', size = 'md', className = '', children, href, ...rest }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-full border transition-opacity duration-200 cursor-pointer select-none whitespace-nowrap'
    + ' disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40';
  const sizes = { md: 'h-[38px] px-[18px] text-sm', sm: 'h-8 px-3.5 text-xs' };
  const variants: Record<Variant, string> = {
    filled:   'bg-blue text-white border-transparent hover:opacity-90',
    outlined: 'bg-transparent text-blue-link border-blue-link hover:bg-ice',
    ghost:    'bg-transparent text-smoke border-hairline hover:bg-frost',
    danger:   'bg-transparent text-danger border-danger/40 hover:bg-danger-wash',
  };
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  if (href) return <a href={href} className={cls}>{children}</a>;
  return <button className={cls} {...rest}>{children}</button>;
}
