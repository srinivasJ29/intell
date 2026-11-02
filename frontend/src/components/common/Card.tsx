import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hoverable = false, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-mono-white border border-mono-border rounded-lg p-5 shadow-subtle',
          hoverable && 'transition-all duration-200 hover:border-mono-medium hover:shadow-elevated cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
