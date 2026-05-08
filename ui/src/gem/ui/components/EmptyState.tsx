'use client';

import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  icon?: React.ComponentType<any>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-12',
        'relative overflow-hidden rounded-glass',
        className,
      )}
    >
      {/* Hoa tiet nen mo nhat */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Biểu tượng */}
      <div className="relative mb-5">
        <div className="p-4 rounded-full bg-bg-3/50">
          <Icon size={48} className="text-txt-3" strokeWidth={1.5} />
        </div>
      </div>

      {/* Tieu de */}
      <h3 className="relative font-heading text-xl text-txt-2 font-semibold mb-2">
        {title}
      </h3>

      {/* Mo ta */}
      {description && (
        <p className="relative text-sm text-txt-3 max-w-md mb-6">
          {description}
        </p>
      )}

      {/* Nut hanh dong */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="relative btn btn-g"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
