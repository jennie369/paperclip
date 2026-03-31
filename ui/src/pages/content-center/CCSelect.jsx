import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Custom styled dropdown that replaces native <select>.
 * Matches CC glass theme — no browser default styling.
 *
 * Usage (drop-in replacement for <select>):
 *   <CCSelect value={val} onChange={(e) => setVal(e.target.value)} className="text-xs w-full">
 *     <option value="a">Option A</option>
 *     <option value="b">Option B</option>
 *   </CCSelect>
 *
 * Also supports options prop:
 *   <CCSelect value={val} onChange={setVal} options={[{value:'a',label:'A'}]} />
 */
export default function CCSelect({
  value,
  onChange,
  options: optionsProp,
  children,
  className = '',
  disabled = false,
  placeholder,
  label,
  ...rest
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  // Parse options from either prop or children
  const options = React.useMemo(() => {
    if (optionsProp) return optionsProp;
    const opts = [];
    React.Children.forEach(children, (child) => {
      if (!child || child.type !== 'option') return;
      opts.push({
        value: child.props.value ?? '',
        label: child.props.children ?? '',
        disabled: child.props.disabled ?? false,
      });
    });
    return opts;
  }, [optionsProp, children]);

  const selectedOpt = options.find((o) => o.value === value);
  const displayLabel = selectedOpt?.label ?? placeholder ?? '';

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Scroll highlighted into view
  useEffect(() => {
    if (!open || highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-opt]');
    items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  // Reset highlight when opening
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  const handleSelect = useCallback(
    (opt) => {
      if (opt.disabled) return;
      // Support both onChange(value) and onChange(syntheticEvent)
      if (onChange) {
        // If onChange expects event-like object (e.target.value pattern)
        onChange({ target: { value: opt.value } });
      }
      setOpen(false);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!open) {
            setOpen(true);
          } else if (highlightedIndex >= 0 && !options[highlightedIndex]?.disabled) {
            handleSelect(options[highlightedIndex]);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!open) { setOpen(true); return; }
          setHighlightedIndex((prev) => {
            let next = prev + 1;
            while (next < options.length && options[next]?.disabled) next++;
            return next < options.length ? next : prev;
          });
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
    [disabled, open, highlightedIndex, options, handleSelect],
  );

  return (
    <div className={`relative ${className}`} ref={containerRef} {...rest}>
      {label && (
        <label className="block text-xs text-txt-2 font-medium mb-1.5">{label}</label>
      )}
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((p) => !p)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`cc-select-trigger ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate ${!selectedOpt ? 'text-txt-3' : ''}`}>
          {displayLabel}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-txt-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div ref={listRef} className="cc-select-dropdown" role="listbox">
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isHighlighted = i === highlightedIndex;
            return (
              <div
                key={opt.value}
                data-opt
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={[
                  'cc-select-option',
                  isHighlighted ? 'cc-select-option-highlighted' : '',
                  isSelected ? 'cc-select-option-selected' : '',
                  opt.disabled ? 'opacity-40 cursor-not-allowed' : '',
                ].filter(Boolean).join(' ')}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="shrink-0 text-gold" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
