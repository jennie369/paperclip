'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChecklistItemProps {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  disabled?: boolean;
  variant?: 'default' | 'success' | 'warning';
  tooltip?: string;
}

const variantCheckedColors: Record<NonNullable<ChecklistItemProps['variant']>, string> = {
  default: 'bg-purple/20 border-purple/40 text-purple',
  success: 'bg-success/20 border-success/40 text-success',
  warning: 'bg-warning/20 border-warning/40 text-warning',
};

export function ChecklistItem({
  label,
  description,
  checked,
  onToggle,
  disabled = false,
  variant = 'default',
  tooltip,
}: ChecklistItemProps): React.JSX.Element {
  const handleClick = () => {
    if (!disabled) {
      onToggle(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onToggle(!checked);
    }
  };

  return (
    <div
      className={cn(
        'cli',
        checked && 'checked',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      title={tooltip}
    >
      {/* Checkbox circle */}
      <div
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors duration-fast',
          checked
            ? variantCheckedColors[variant]
            : 'border-border-2 bg-transparent',
        )}
      >
        {checked && <Check className="w-3 h-3" />}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            'text-sm transition-colors duration-fast',
            checked ? 'line-through text-txt-3' : 'text-txt',
          )}
        >
          {label}
        </span>
        {description && (
          <p className="text-xxs text-txt-3 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
