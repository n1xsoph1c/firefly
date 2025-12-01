'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      interactive = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const variants = {
      default: 'bg-zinc-900 border border-zinc-800',
      elevated: 'bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20',
      bordered: 'bg-zinc-900 border-2 border-zinc-700',
      ghost: 'bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm',
    };
    
    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };
    
    const interactiveStyles = interactive
      ? 'hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-200 cursor-pointer active:scale-[0.99]'
      : 'transition-all duration-200';
    
    return (
      <div
        ref={ref}
        className={`
          rounded-xl
          ${variants[variant]}
          ${paddings[padding]}
          ${interactiveStyles}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
