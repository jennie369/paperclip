'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  footer?: React.ReactNode;
}

const sizeMap: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  footer,
}: ModalProps): React.JSX.Element | null {
  const contentRef = useRef<HTMLDivElement>(null);

  // Phim Escape de dong
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  // Bay Phan tu (focus trap) va phim Escape
  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Tìm phần tử có thể focus đầu tiên
    const timer = setTimeout(() => {
      if (contentRef.current) {
        const focusableSelectors =
          'a[href], button:not(:disabled), textarea:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';
        const firstFocusable = contentRef.current.querySelector<HTMLElement>(focusableSelectors);
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-modal-backdrop',
        'flex items-center justify-center',
        'bg-black/50 backdrop-blur-sm',
        'animate-fade-in',
      )}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={contentRef}
        className={cn(
          'glass-card w-full mx-4',
          'flex flex-col',
          'animate-slide-up',
          sizeMap[size],
        )}
        style={{ maxHeight: '85vh' }}
      >
        {/* Phan dau -- Tieu de */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2
              id="modal-title"
              className="font-heading text-xl text-txt font-semibold"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-txt-2 mt-1">{subtitle}</p>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className={cn(
                'p-1.5 rounded-badge ml-4 flex-shrink-0',
                'text-txt-3 hover:text-txt hover:bg-bg-4',
                'transition-all duration-normal',
              )}
              aria-label="Dong"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Noi dung chinh */}
        <div
          className="flex-1 overflow-y-auto p-5"
          style={{ maxHeight: '60vh' }}
        >
          {children}
        </div>

        {/* Chan trang (tuy chon) */}
        {footer && (
          <div className="border-t border-border p-5 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
