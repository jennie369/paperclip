'use client';

import React, { forwardRef, useId, useState, useCallback } from 'react';
import { cn } from '../lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  showCount?: boolean;
  tooltip?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    error,
    hint,
    maxLength,
    showCount = false,
    tooltip,
    className,
    id: externalId,
    onChange,
    value: controlledValue,
    defaultValue,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const textareaId = externalId ?? generatedId;

  const [internalValue, setInternalValue] = useState<string>(
    (defaultValue as string) ?? '',
  );

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? String(controlledValue) : internalValue;
  const currentLength = currentValue.length;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!isControlled) {
        setInternalValue(e.target.value);
      }
      onChange?.(e);
    },
    [isControlled, onChange],
  );

  const field = (
    <div className="w-full">
      {/* Nhan */}
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs text-txt-2 font-medium mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Truong nhap van ban */}
      <div className="relative">
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'ft',
            error && 'border-danger focus:border-danger focus:shadow-none',
            className,
          )}
          maxLength={maxLength}
          value={isControlled ? controlledValue : undefined}
          defaultValue={!isControlled ? defaultValue : undefined}
          onChange={handleChange}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : hint
                ? `${textareaId}-hint`
                : undefined
          }
          {...rest}
        />

        {/* Bo dem ky tu */}
        {showCount && (
          <div className="absolute bottom-2 right-3 text-xxs text-txt-3 pointer-events-none select-none">
            {currentLength}
            {maxLength !== undefined ? ` / ${maxLength}` : ''}
          </div>
        )}
      </div>

      {/* Thong bao loi */}
      {error && (
        <p id={`${textareaId}-error`} className="text-xxs text-danger mt-1" role="alert">
          {error}
        </p>
      )}

      {/* Goi y */}
      {!error && hint && (
        <p id={`${textareaId}-hint`} className="text-xxs text-txt-3 mt-1">
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
