'use client';

import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    primary: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };
  
  const dotVariants = {
    default: 'bg-zinc-400',
    primary: 'bg-violet-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    info: 'bg-blue-400',
  };
  
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotVariants[variant]}`} />
      )}
      {children}
    </span>
  );
}
