'use client';

import React, { useId, useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  tooltip?: string;
}

export function Select({
  options,
  value,
  onChange,
  label,
  error,
  placeholder = 'Chọn một tùy chọn...',
  disabled = false,
  className,
  tooltip,
}: SelectProps): React.JSX.Element {
  const generatedId = useId();
  const selectId = generatedId;
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label ?? placeholder;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Scroll highlighted into view
  useEffect(() => {
    if (!open || highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-option]');
    items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  // Reset highlight when opening
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!open) {
            setOpen(true);
          } else if (highlightedIndex >= 0 && !options[highlightedIndex]?.disabled) {
            onChange?.(options[highlightedIndex].value);
            setOpen(false);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!open) {
            setOpen(true);
          } else {
            setHighlightedIndex((prev) => {
              let next = prev + 1;
              while (next < options.length && options[next]?.disabled) next++;
              return next < options.length ? next : prev;
            });
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (open) {
            setHighlightedIndex((prev) => {
              let next = prev - 1;
              while (next >= 0 && options[next]?.disabled) next--;
              return next >= 0 ? next : prev;
            });
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
        case 'Tab':
          setOpen(false);
          break;
      }
    },
    [disabled, open, highlightedIndex, options, onChange],
  );

  const handleSelect = useCallback(
    (opt: SelectOption) => {
      if (opt.disabled) return;
      onChange?.(opt.value);
      setOpen(false);
    },
    [onChange],
  );

  const field = (
    <div className={cn('w-full', className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs text-txt-2 font-medium mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {/* Trigger button */}
        <button
          id={selectId}
          type="button"
          onClick={() => !disabled && setOpen((p) => !p)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'cc-select-trigger',
            error && 'border-danger',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${selectId}-error` : undefined}
        >
          <span className={cn('truncate', !selectedOption && 'text-txt-3')}>
            {displayLabel}
          </span>
          <ChevronDown
            size={16}
            className={cn('shrink-0 text-txt-3 transition-transform duration-200', open && 'rotate-180')}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            ref={listRef}
            role="listbox"
            className="cc-select-dropdown"
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              const isHighlighted = i === highlightedIndex;
              return (
                <div
                  key={opt.value}
                  data-option
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  className={cn(
                    'cc-select-option',
                    isHighlighted && 'cc-select-option-highlighted',
                    isSelected && 'cc-select-option-selected',
                    opt.disabled && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={14} className="shrink-0 text-gold" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p id={`${selectId}-error`} className="text-xxs text-danger mt-1" role="alert">
          {error}
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
}
