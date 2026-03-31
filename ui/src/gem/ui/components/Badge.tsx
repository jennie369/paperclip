'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';

interface BadgeProps {
  text: string;
  variant: 'gold' | 'new' | 'key' | 'v3' | 'success' | 'danger' | 'info' | 'default';
  size?: 'sm' | 'md';
  dot?: boolean;
  tooltip?: string;
}

/* Bien the CSS tu globals.css */
const cssVariantMap: Record<string, string> = {
  gold: 'badge-gold',
  new: 'badge-new',
  key: 'badge-key',
  v3: 'badge-v3',
};

/* Bien the bo sung (khong co san trong globals.css) */
const extraVariantMap: Record<string, string> = {
  success: 'bg-emerald/20 text-emerald',
  danger: 'bg-danger/20 text-danger',
  info: 'bg-blue/20 text-blue',
  default: 'bg-bg-4 text-txt-2',
};

/* Mau cham trang thai */
const dotColorMap: Record<BadgeProps['variant'], string> = {
  gold: 'bg-gold',
  new: 'bg-emerald',
  key: 'bg-rose',
  v3: 'bg-blue',
  success: 'bg-emerald',
  danger: 'bg-danger',
  info: 'bg-blue',
  default: 'bg-txt-3',
};

const sizeMap: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'text-xxs px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
};

export function Badge({
  text,
  variant,
  size = 'sm',
  dot = false,
  tooltip,
}: BadgeProps): React.JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (!tooltip) return;
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 300);
  }, [tooltip]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  /* Xac dinh lop CSS phu hop */
  const isCssVariant = variant in cssVariantMap;
  const variantClass = isCssVariant
    ? cssVariantMap[variant]
    : extraVariantMap[variant] ?? extraVariantMap.default;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className={cn(
          isCssVariant ? 'badge' : '',
          variantClass,
          'inline-flex items-center gap-1.5 rounded-badge font-bold uppercase tracking-wide',
          sizeMap[size],
        )}
      >
        {/* Cham mau trang thai */}
        {dot && (
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full flex-shrink-0',
              dotColorMap[variant],
            )}
          />
        )}
        {text}
      </span>

      {/* Chu thich noi bat */}
      {tooltip && showTooltip && (
        <div
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
            'px-3 py-1.5 rounded-badge',
            'bg-bg-2 text-txt text-xxs font-medium',
            'whitespace-nowrap shadow-card-md',
            'animate-fade-in pointer-events-none z-tooltip',
          )}
          role="tooltip"
        >
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-bg-2" />
        </div>
      )}
    </div>
  );
}
