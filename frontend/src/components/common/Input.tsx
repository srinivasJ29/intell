import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-mono-dark">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 text-sm bg-mono-white text-mono-deepblack placeholder:text-mono-medium border border-mono-border rounded-md shadow-subtle transition-all duration-150',
              'focus:outline-none focus:ring-1 focus:ring-mono-black focus:border-mono-black',
              'disabled:bg-mono-light disabled:cursor-not-allowed',
              error && 'border-red-600 focus:ring-red-600 focus:border-red-600',
              className
            )
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-600">{error}</span>}
        {helperText && !error && <span className="text-xs text-mono-medium">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

