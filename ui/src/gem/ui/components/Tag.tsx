'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface TagProps {
  children: React.ReactNode;
  variant: 'wealth' | 'wellness' | 'integration' | 'latc' | 'tmt' | 'default';
  size?: 'sm' | 'md';
  removable?: boolean;
  onRemove?: () => void;
  tooltip?: string;
}

const variantMap: Record<TagProps['variant'], string> = {
  wealth: 'tg-w',
  wellness: 'tg-wl',
  integration: 'tg-ig',
  latc: 'tg-w',
  tmt: 'tg-wl',
  default: 'bg-bg-4 border-border-2 text-txt-2',
};

const sizeMap: Record<NonNullable<TagProps['size']>, string> = {
  sm: 'text-xxs px-2 py-0.5',
  md: 'text-xs px-3 py-1',
};

export function Tag({
  children,
  variant,
  size = 'md',
  removable = false,
  onRemove,
  tooltip,
}: TagProps): React.JSX.Element {
  return (
    <span
      className={cn('tg', variantMap[variant], sizeMap[size])}
      title={tooltip}
    >
      {children}
      {removable && (
        <button
          type="button"
          className="ml-1 inline-flex items-center justify-center rounded-full hover:opacity-70 transition-opacity duration-fast focus:outline-none"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          aria-label="Xóa thẻ"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
