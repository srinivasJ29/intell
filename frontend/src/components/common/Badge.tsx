import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'ready' | 'processing' | 'pending' | 'failed' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className }) => {
  const variants = {
    ready: 'bg-mono-deepblack text-mono-white border-mono-deepblack',
    processing: 'bg-mono-light text-mono-dark border-mono-border animate-pulse',
    pending: 'bg-mono-light text-mono-medium border-mono-border',
    failed: 'bg-mono-white text-red-700 border-red-300 font-semibold',
    neutral: 'bg-mono-offwhite text-mono-dark border-mono-border',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono font-medium rounded border uppercase tracking-wider',
          variants[variant],
          className
        )
      )}
    >
      {children}
    </span>
  );
};
