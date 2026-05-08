'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ComponentType<any>;
  color: 'gold' | 'purple' | 'blue' | 'emerald';
  tooltip?: string;
  loading?: boolean;
}

const colorVariantMap: Record<StatCardProps['color'], string> = {
  gold: 'gd',
  purple: 'pu',
  blue: 'bl',
  emerald: 'em',
};

const iconColorMap: Record<StatCardProps['color'], string> = {
  gold: 'text-gold',
  purple: 'text-purple',
  blue: 'text-blue',
  emerald: 'text-emerald',
};

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  color,
  tooltip,
  loading = false,
}: StatCardProps): React.JSX.Element {
  const content = (
    <div className={cn('sc', colorVariantMap[color])}>
      {/* Tieu de va icon */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-txt-2 font-medium">{label}</span>
        {Icon && (
          <div className={cn('p-2 rounded-card bg-bg-3/50', iconColorMap[color])}>
            <Icon size={18} />
          </div>
        )}
      </div>

      {/* Gia tri */}
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-24 bg-bg-4 rounded-sm animate-pulse" />
          <div className="h-4 w-16 bg-bg-4 rounded-sm animate-pulse" />
        </div>
      ) : (
        <>
          <div className="text-2xl font-heading font-bold text-txt mb-1">
            {value}
          </div>

          {/* Thay doi phan tram */}
          {change !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                change >= 0 ? 'text-success' : 'text-danger',
              )}
            >
              {change >= 0 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              <span>
                {change >= 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>
              <span className="text-txt-3 ml-1">so voi ky truoc</span>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (tooltip) {
    return (
      <div className="relative group">
        {content}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-sm bg-bg-5 text-txt text-xxs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-normal z-tooltip">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-bg-5" />
        </div>
      </div>
    );
  }

  return content;
}
