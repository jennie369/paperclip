'use client';

import React, { useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { create } from 'zustand';
import { cn } from '../lib/utils';

/* ═══════════════════════════════════════════════════════════
   Kieu du lieu (Types)
   ═══════════════════════════════════════════════════════════ */

interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface ToastStore {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => string;
  removeToast: (id: string) => void;
}

/* ═══════════════════════════════════════════════════════════
   Kho luu tru trang thai (Zustand Store)
   ═══════════════════════════════════════════════════════════ */

export const useToast = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

/* ═══════════════════════════════════════════════════════════
   Cau hinh giao dien (UI Config)
   ═══════════════════════════════════════════════════════════ */

const iconMap: Record<ToastData['type'], React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const iconColorMap: Record<ToastData['type'], string> = {
  success: 'text-emerald',
  error: 'text-danger',
  info: 'text-blue',
  warning: 'text-amber',
};

const borderColorMap: Record<ToastData['type'], string> = {
  success: 'border-l-emerald',
  error: 'border-l-danger',
  info: 'border-l-blue',
  warning: 'border-l-amber',
};

const defaultDurationMap: Record<ToastData['type'], number> = {
  success: 5000,
  error: 8000,
  info: 5000,
  warning: 5000,
};

const positionMap: Record<NonNullable<ToastContainerProps['position']>, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

/* ═══════════════════════════════════════════════════════════
   Thanh phan Toast don le (Single Toast Item)
   ═══════════════════════════════════════════════════════════ */

function ToastItem({ toast }: { toast: ToastData }): React.JSX.Element {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeToast = useToast((state) => state.removeToast);
  const Icon = iconMap[toast.type];
  const duration = toast.duration ?? defaultDurationMap[toast.type];

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        removeToast(toast.id);
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast.id, duration, removeToast]);

  return (
    <div
      className={cn(
        'glass-card p-4 pr-10 min-w-[320px] max-w-[420px]',
        'border-l-4',
        borderColorMap[toast.type],
        'animate-slide-in',
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Nút đóng thông báo */}
      <button
        onClick={() => removeToast(toast.id)}
        className={cn(
          'absolute top-3 right-3 p-1 rounded-sm',
          'text-txt-3 hover:text-txt hover:bg-bg-4',
          'transition-all duration-normal',
        )}
        aria-label="Đóng thông báo"
      >
        <X size={14} />
      </button>

      <div className="flex items-start gap-3">
        {/* Biểu tượng trạng thái */}
        <div className={cn('flex-shrink-0 mt-0.5', iconColorMap[toast.type])}>
          <Icon size={20} />
        </div>

        {/* Nội dung thông báo */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="text-sm font-semibold text-txt mb-0.5">
              {toast.title}
            </p>
          )}
          <p className="text-sm text-txt-2">{toast.message}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Thanh phan chua Toast (Toast Container)
   ═══════════════════════════════════════════════════════════ */

export function ToastContainer({
  position = 'top-right',
}: ToastContainerProps): React.JSX.Element | null {
  const currentToasts = useToast((state) => state.toasts);

  if (currentToasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed z-toast flex flex-col gap-3',
        positionMap[position],
      )}
    >
      {currentToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
