'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ElementType<any>;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  tooltip?: string;
}

const variantMap: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'btn btn-primary',
  gold: 'btn btn-g',
  outline: 'btn btn-o',
  ghost: 'btn bg-transparent text-txt-2 hover:text-txt hover:bg-[rgba(255,255,255,0.05)]',
  danger: 'btn btn-danger',
};

const sizeMap: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-md px-6 py-3',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  tooltip,
  children,
  disabled,
  className,
  ...rest
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  const button = (
    <button
      className={cn(
        variantMap[variant],
        sizeMap[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={isDisabled}
      {...rest}
    >
      {/* Icon hoac loading ben trai */}
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" />
      ) : (
        Icon && iconPosition === 'left' && <Icon size={iconSize} />
      )}

      {children}

      {/* Icon ben phai (khong hien thi khi loading) */}
      {!loading && Icon && iconPosition === 'right' && <Icon size={iconSize} />}
    </button>
  );

  if (tooltip) {
    return (
      <div className="relative group inline-flex">
        {button}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-sm bg-bg-5 text-txt text-xxs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-normal z-tooltip">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-bg-5" />
        </div>
      </div>
    );
  }

  return button;
}
