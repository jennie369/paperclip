'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import {
  X,
  Keyboard,
  Navigation,
  Zap,
  PenLine,
  Command,
} from 'lucide-react';
import { cn } from '../lib/utils';

/* ═══════════════════════════════════════════════════════════
   Kieu du lieu (Types)
   ═══════════════════════════════════════════════════════════ */

export interface ShortcutConfig {
  /** To hop phim, vi du: 'ctrl+n', 'ctrl+shift+p', 'escape' */
  keys: string;
  /** Mo ta hanh dong */
  description: string;
  /** Danh muc phan loai */
  category: 'navigation' | 'action' | 'editing';
  /** Ham thuc thi khi nhan phim tat */
  handler: () => void;
  /** Vo hieu hoa phim tat nay */
  disabled?: boolean;
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string;
  label: string;
  category: 'navigation' | 'action' | 'editing';
}

/* ═══════════════════════════════════════════════════════════
   Hang so (Constants)
   ═══════════════════════════════════════════════════════════ */

const CATEGORY_CONFIG: Record<
  ShortcutEntry['category'],
  { label: string; icon: React.ElementType; color: string }
> = {
  navigation: {
    label: 'Dieu Huong',
    icon: Navigation,
    color: 'text-cyan',
  },
  action: {
    label: 'Hanh Dong',
    icon: Zap,
    color: 'text-gold',
  },
  editing: {
    label: 'Chinh Sua',
    icon: PenLine,
    color: 'text-purple',
  },
};

/** Danh sach day du cac phim tat */
const ALL_SHORTCUTS: ShortcutEntry[] = [
  // ---- Dieu huong ----
  { keys: 'Ctrl+1', label: 'Bang Dieu Khien', category: 'navigation' },
  { keys: 'Ctrl+2', label: 'LATC', category: 'navigation' },
  { keys: 'Ctrl+3', label: 'TMT', category: 'navigation' },
  { keys: 'Ctrl+4', label: 'Clip Ngan', category: 'navigation' },
  { keys: 'Ctrl+5', label: 'Bai Dang MXH', category: 'navigation' },
  { keys: 'Ctrl+K', label: 'Tim kiem nhanh', category: 'navigation' },
  { keys: 'Ctrl+Shift+P', label: 'Bang Lenh', category: 'navigation' },
  { keys: 'Ctrl+/', label: 'Tro giup phim tat', category: 'navigation' },

  // ---- Hanh dong ----
  { keys: 'Ctrl+N', label: 'Tao moi', category: 'action' },
  { keys: 'Ctrl+S', label: 'Luu', category: 'action' },
  { keys: 'Ctrl+G', label: 'Tạo nội dung AI', category: 'action' },

  // ---- Chinh sua ----
  { keys: 'Esc', label: 'Dong modal/panel', category: 'editing' },
];

/* ═══════════════════════════════════════════════════════════
   Tien ich (Utilities)
   ═══════════════════════════════════════════════════════════ */

/**
 * Phân tích chuỗi phím tắt thành đối tượng kiểm tra.
 * Vi du: 'ctrl+shift+p' -> { ctrl: true, shift: true, key: 'p' }
 */
function parseShortcutKeys(keys: string): {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
} {
  const parts = keys.toLowerCase().split('+');
  return {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta'),
    key: parts.filter(
      (p) => !['ctrl', 'shift', 'alt', 'meta'].includes(p),
    )[0] || '',
  };
}

/**
 * Kiểm tra sự kiện bàn phím có khớp với phím tắt hay không.
 */
function matchesShortcut(
  event: KeyboardEvent,
  keys: string,
): boolean {
  const parsed = parseShortcutKeys(keys);

  // Xu ly phim Escape dac biet
  if (parsed.key === 'escape' || parsed.key === 'esc') {
    return event.key === 'Escape' && !parsed.ctrl && !parsed.shift && !parsed.alt;
  }

  // Xu ly phim so (1-9)
  const eventKey = event.key.toLowerCase();
  const isDigit = /^[0-9]$/.test(parsed.key);

  const keyMatch = isDigit
    ? eventKey === parsed.key
    : eventKey === parsed.key || event.code.toLowerCase() === `key${parsed.key}`;

  // Xu ly phim dac biet
  const slashMatch = parsed.key === '/' && (eventKey === '/' || event.code === 'Slash');

  return (
    (keyMatch || slashMatch) &&
    event.ctrlKey === parsed.ctrl &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt
  );
}

/**
 * Chuyen doi chuoi phim tat thanh mang cac nhan hien thi.
 * Vi du: 'Ctrl+Shift+P' -> ['Ctrl', 'Shift', 'P']
 */
function formatKeyParts(keys: string): string[] {
  return keys.split('+').map((part) => {
    const lower = part.toLowerCase();
    if (lower === 'ctrl') return 'Ctrl';
    if (lower === 'shift') return 'Shift';
    if (lower === 'alt') return 'Alt';
    if (lower === 'meta') return 'Meta';
    if (lower === 'esc' || lower === 'escape') return 'Esc';
    return part.toUpperCase();
  });
}

/* ═══════════════════════════════════════════════════════════
   Hook: useKeyboardShortcuts
   ═══════════════════════════════════════════════════════════ */

/**
 * Hook đăng ký và xử lý các phím tắt toàn cục.
 *
 * @param shortcuts - Mang cau hinh phim tat
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { keys: 'ctrl+n', description: 'Tao moi', category: 'action', handler: () => router.push('/ai-gen') },
 *   { keys: 'ctrl+s', description: 'Luu', category: 'action', handler: () => handleSave() },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      // Bo qua khi dang go trong input/textarea (tru Escape va to hop Ctrl+)
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.disabled) continue;
        if (!matchesShortcut(event, shortcut.keys)) continue;

        // Cho phep Escape va to hop co Ctrl hoat dong trong input
        const parsed = parseShortcutKeys(shortcut.keys);
        const isEsc = parsed.key === 'escape' || parsed.key === 'esc';
        const hasModifier = parsed.ctrl || parsed.meta;

        if (isInputFocused && !isEsc && !hasModifier) continue;

        event.preventDefault();
        event.stopPropagation();
        shortcut.handler();
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);
}

/* ═══════════════════════════════════════════════════════════
   Thanh phan phu: ShortcutRow
   ═══════════════════════════════════════════════════════════ */

function ShortcutRow({
  entry,
}: {
  entry: ShortcutEntry;
}): React.JSX.Element {
  const parts = formatKeyParts(entry.keys);

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-badge hover:bg-bg-3/50 transition-colors duration-fast group">
      {/* Mo ta */}
      <span className="text-sm text-txt-2 group-hover:text-txt transition-colors duration-fast">
        {entry.label}
      </span>

      {/* To hop phim */}
      <div className="flex items-center gap-1">
        {parts.map((part, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <span className="text-txt-3 text-xxs select-none">+</span>
            )}
            <kbd
              className={cn(
                'inline-flex items-center justify-center',
                'min-w-[24px] h-6 px-1.5',
                'rounded-sm border border-border-2',
                'bg-bg-3 text-txt text-xxs font-mono font-medium',
                'shadow-card-sm select-none',
              )}
            >
              {part}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Thanh phan phu: CategorySection
   ═══════════════════════════════════════════════════════════ */

function CategorySection({
  category,
  entries,
}: {
  category: ShortcutEntry['category'];
  entries: ShortcutEntry[];
}): React.JSX.Element {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  return (
    <div className="space-y-1">
      {/* Tieu de danh muc */}
      <div className="flex items-center gap-2 mb-2 px-3 pt-1">
        <Icon size={14} className={config.color} />
        <h4
          className={cn(
            'font-heading text-sm font-semibold uppercase tracking-wide',
            config.color,
          )}
        >
          {config.label}
        </h4>
      </div>

      {/* Danh sach phim tat trong danh muc */}
      <div className="space-y-0.5">
        {entries.map((entry) => (
          <ShortcutRow key={entry.keys} entry={entry} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Thanh phan chinh: KeyboardShortcutsHelp
   ═══════════════════════════════════════════════════════════ */

/**
 * Modal hien thi danh sach tat ca phim tat theo danh muc.
 * Dong bang phim Escape hoac click ben ngoai.
 */
export function KeyboardShortcutsHelp({
  isOpen,
  onClose,
}: KeyboardShortcutsHelpProps): React.JSX.Element | null {
  const contentRef = useRef<HTMLDivElement>(null);

  // Phan nhom phim tat theo danh muc
  const grouped = ALL_SHORTCUTS.reduce<
    Record<ShortcutEntry['category'], ShortcutEntry[]>
  >(
    (acc, entry) => {
      acc[entry.category].push(entry);
      return acc;
    },
    { navigation: [], action: [], editing: [] },
  );

  // Phim Escape de dong
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  // Dang ky su kien va khoa cuon trang
  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleKeyDown, true);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-command',
        'flex items-center justify-center',
        'animate-fade-in',
      )}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-help-title"
    >
      <div
        ref={contentRef}
        className={cn(
          'w-full max-w-2xl mx-4',
          'rounded-card border border-border-2',
          'shadow-card-lg',
          'flex flex-col',
          'animate-slide-up',
        )}
        style={{
          background: '#0e0e16',
          maxHeight: '80vh',
        }}
      >
        {/* Phan dau -- Tieu de */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-badge bg-gold/10">
              <Keyboard size={18} className="text-gold" />
            </div>
            <div>
              <h3
                id="shortcuts-help-title"
                className="font-heading text-xl text-txt font-semibold"
              >
                Phim Tat
              </h3>
              <p className="text-xxs text-txt-3 mt-0.5">
                Cac phim tat giup thao tac nhanh hon
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={cn(
              'p-1.5 rounded-badge flex-shrink-0',
              'text-txt-3 hover:text-txt hover:bg-bg-4',
              'transition-all duration-normal',
            )}
            aria-label="Dong"
          >
            <X size={18} />
          </button>
        </div>

        {/* Noi dung — Luoi phim tat theo danh muc */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cot trai: Dieu huong */}
            <div className="space-y-4">
              <CategorySection
                category="navigation"
                entries={grouped.navigation}
              />
            </div>

            {/* Cot phai: Hanh dong + Chinh sua */}
            <div className="space-y-6">
              <CategorySection
                category="action"
                entries={grouped.action}
              />
              <CategorySection
                category="editing"
                entries={grouped.editing}
              />
            </div>
          </div>
        </div>

        {/* Chan trang -- Ghi chu */}
        <div className="border-t border-border px-5 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xxs text-txt-3">
              Nhan{' '}
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-sm border border-border-2 bg-bg-3 text-txt text-xxs font-mono">
                Ctrl
              </kbd>
              {' '}+{' '}
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-sm border border-border-2 bg-bg-3 text-txt text-xxs font-mono">
                /
              </kbd>
              {' '}de mo/dong tro giup nay
            </p>
            <div className="flex items-center gap-1.5">
              <Command size={12} className="text-txt-3" />
              <span className="text-xxs text-txt-3">
                GEM Content Center
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
