'use client';

import React, { forwardRef, useId } from 'react';
import { cn } from '../lib/utils';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ComponentType<any>;
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}

const sizeMap: Record<NonNullable<InputProps['size']>, string> = {
  sm: 'text-xs py-1.5 px-3',
  md: 'text-sm py-2 px-3.5',
  lg: 'text-md py-3 px-4',
};

const iconSizeMap: Record<NonNullable<InputProps['size']>, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    icon: Icon,
    size = 'md',
    tooltip,
    className,
    id: externalId,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;

  const field = (
    <div className="w-full">
      {/* Nhan */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs text-txt-2 font-medium mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Truong nhap */}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-3 pointer-events-none">
            <Icon size={iconSizeMap[size]} />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'fi',
            sizeMap[size],
            Icon && 'pl-10',
            error && 'border-danger focus:border-danger focus:shadow-none',
            className,
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...rest}
        />
      </div>

      {/* Thong bao loi */}
      {error && (
        <p id={`${inputId}-error`} className="text-xxs text-danger mt-1" role="alert">
          {error}
        </p>
      )}

      {/* Goi y */}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-xxs text-txt-3 mt-1">
          {hint}
        </p>
      )}
    </div>
  );

  if (tooltip) {
    return (
      <div className="relative group">
        {field}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-sm bg-bg-5 text-txt text-xxs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-normal z-tooltip">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-bg-5" />
        </div>
      </div>
    );
  }

  return field;
});
