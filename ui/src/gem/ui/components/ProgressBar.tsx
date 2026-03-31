'use client';

import React from 'react';
import { cn } from '../lib/utils';

interface ProgressBarProps {
  value: number;
  color?: 'gold' | 'purple' | 'emerald' | 'blue' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const colorMap: Record<NonNullable<ProgressBarProps['color']>, string> = {
  gold: 'bg-gradient-to-r from-gold to-gold-light',
  purple: 'bg-gradient-to-r from-purple to-purple-glow',
  emerald: 'bg-gradient-to-r from-emerald to-emerald/80',
  blue: 'bg-gradient-to-r from-blue to-blue/80',
  danger: 'bg-gradient-to-r from-danger to-danger/80',
};

const sizeMap: Record<NonNullable<ProgressBarProps['size']>, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({
  value,
  color = 'gold',
  size = 'md',
  showLabel = false,
  label,
  animated = false,
  className,
}: ProgressBarProps): React.JSX.Element {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <span className="text-xs text-txt-2">{label}</span>
          )}
          <span className="text-xs text-txt-2 ml-auto">
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}
      <div className={cn('pb', sizeMap[size])}>
        <div
          className={cn(
            'pf',
            colorMap[color],
            animated && 'transition-all duration-slow ease-glass',
          )}
          style={{ width: `${clampedValue}%` }}
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || `Tiến độ: ${Math.round(clampedValue)}%`}
        />
      </div>
    </div>
  );
}
