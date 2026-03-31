'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  Sparkles,
  AlertCircle,
  Eye,
  Clock,
  Settings,
  BarChart2,
  CheckCheck,
  X,
  Inbox,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType =
  | 'generation_complete'
  | 'generation_error'
  | 'review_needed'
  | 'reminder'
  | 'system'
  | 'analytics_ready';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  link?: string;
}

interface NotificationCenterProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  generation_complete: {
    icon: Sparkles,
    color: 'text-gold',
    bgColor: 'bg-gold/10',
  },
  generation_error: {
    icon: AlertCircle,
    color: 'text-danger',
    bgColor: 'bg-danger/10',
  },
  review_needed: {
    icon: Eye,
    color: 'text-purple',
    bgColor: 'bg-purple/10',
  },
  reminder: {
    icon: Clock,
    color: 'text-blue',
    bgColor: 'bg-blue/10',
  },
  system: {
    icon: Settings,
    color: 'text-txt-2',
    bgColor: 'bg-bg-3/50',
  },
  analytics_ready: {
    icon: BarChart2,
    color: 'text-emerald',
    bgColor: 'bg-emerald/10',
  },
};

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

function createMockNotifications(): Notification[] {
  const now = Date.now();
  const min = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;

  return [
    {
      id: 'n1',
      type: 'generation_complete',
      title: 'Kich ban da hoan thanh',
      message: 'LATC "Tại Sao 95% Trader Thất Bại" đã được tạo thành công. 4,823 từ, 9 phần.',
      createdAt: new Date(now - 12 * min),
      read: false,
    },
    {
      id: 'n2',
      type: 'review_needed',
      title: 'Can review Brand Voice',
      message: 'Kich ban "Nang Luong Dong Tien" co 3 vi pham brand voice can sua. Diem: 72/100.',
      createdAt: new Date(now - 45 * min),
      read: false,
    },
    {
      id: 'n3',
      type: 'generation_error',
      title: 'Lỗi tạo nội dung',
      message: 'Không thể tạo Short Clip "Thiện và Trading". Lỗi: vượt giới hạn token. Vui lòng thử lại.',
      createdAt: new Date(now - 2 * hour),
      read: false,
    },
    {
      id: 'n4',
      type: 'analytics_ready',
      title: 'Bao cao phan tich moi',
      message: 'Bao cao YouTube thang 2/2026 da san sang. Tong luot xem: 412K, CTR tang 1.3%.',
      createdAt: new Date(now - 5 * hour),
      read: true,
    },
    {
      id: 'n5',
      type: 'reminder',
      title: 'Lich dang video',
      message: 'Video "Bitcoin Halving 2025" được lên lịch đăng vào 18:00 hôm nay. Kiểm tra lần cuối?',
      createdAt: new Date(now - 8 * hour),
      read: true,
    },
    {
      id: 'n6',
      type: 'system',
      title: 'Cap nhat he thong',
      message: 'GEM Content Center v2.1 đã được cập nhật. Tính năng mới: Repurpose Engine, AI Analysis.',
      createdAt: new Date(now - 1 * day),
      read: true,
    },
    {
      id: 'n7',
      type: 'generation_complete',
      title: 'Tiêu đề đã được tạo',
      message: '10 tieu de cho chu de "Tam Ly Giao Dich" da san sang. Bam de xem va chon.',
      createdAt: new Date(now - 1.5 * day),
      read: true,
    },
    {
      id: 'n8',
      type: 'review_needed',
      title: 'Kich ban cho duyet',
      message: 'TMT "Thầy Minh Tuệ Và Nhân Quả" cần được review trước khi xuất bản. 5,102 từ.',
      createdAt: new Date(now - 2 * day),
      read: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Vua xong';
  if (diffMin < 60) return `${diffMin} phut truoc`;
  if (diffHour < 24) return `${diffHour} gio truoc`;
  if (diffDay < 7) return `${diffDay} ngay truoc`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// ---------------------------------------------------------------------------
// NotificationItem
// ---------------------------------------------------------------------------

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const config = TYPE_CONFIG[notification.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors duration-200 cursor-pointer',
        'hover:bg-[rgba(255,255,255,0.03)]',
        !notification.read && 'bg-[rgba(212,168,67,0.03)]',
      )}
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id);
      }}
    >
      {/* Icon */}
      <div className={cn('p-2 rounded-card flex-shrink-0', config.bgColor)}>
        <Icon size={16} className={config.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium truncate',
              notification.read ? 'text-txt-2' : 'text-txt',
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-txt-3 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <span className="text-xxs text-txt-3 mt-1 block">
          {timeAgo(notification.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NotificationCenter
// ---------------------------------------------------------------------------

export function NotificationCenter({ className }: NotificationCenterProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(createMockNotifications);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen((o) => !o);
  }, []);

  return (
    <div className={cn('relative', className)}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative p-2 rounded-card text-txt-2 hover:text-txt hover:bg-[rgba(255,255,255,0.05)] transition-all duration-200"
        aria-label={`Thong bao${unreadCount > 0 ? ` (${unreadCount} chua doc)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-danger text-white text-xxs font-bold px-1 animate-fade-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className={cn(
            'absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)]',
            'rounded-card border border-border-2',
            'shadow-card-lg z-dropdown',
            'animate-fade-in',
            'flex flex-col',
          )}
          style={{
            background: '#0e0e16',
            maxHeight: '480px',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-semibold text-txt">
                Thong Bao
              </h3>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-gold/20 text-gold text-xxs font-bold px-1.5">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs text-txt-2 hover:text-txt hover:bg-bg-3/50 transition-all"
                  title="Danh dau tat ca da doc"
                >
                  <CheckCheck size={14} />
                  <span className="hidden sm:inline">Doc tat ca</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-sm text-txt-3 hover:text-txt hover:bg-bg-3/50 transition-all"
                aria-label="Dong"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="p-3 rounded-full bg-bg-3/50 mb-3">
                  <Inbox size={32} className="text-txt-3" />
                </div>
                <p className="text-sm text-txt-3 font-medium">
                  Không có thông báo mới
                </p>
                <p className="text-xs text-txt-3 mt-1">
                  Tất cả thông báo sẽ hiển thị ở đây
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5">
              <button className="w-full text-center text-xs text-gold hover:text-gold/80 font-medium transition-colors">
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

