'use client';

import { lockBodyScroll } from '../../../lib/body-scroll-lock';
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  Search,
  X,
  LayoutDashboard,
  Sparkles,
  FileText,
  Film,
  MessageSquare,
  Image,
  ImagePlus,
  Calendar,
  BarChart2,
  Recycle,
  Target,
  Mic2,
  Settings,
  Plus,
  Wand2,
  Save,
  Download,
  RefreshCw,
  BookOpen,
  ArrowRight,
  Clock,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '../lib/utils';

/* ═══════════════════════════════════════════════════════════
   Kieu du lieu (Types)
   ═══════════════════════════════════════════════════════════ */

type CommandCategory = 'navigation' | 'action' | 'recent';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  icon: React.ComponentType<any>;
  /** Đường dẫn điều hướng */
  route?: string;
  /** Mã hành động */
  action?: string;
  /** Phím tắt tương ứng (hiển thị) */
  shortcut?: string;
  /** Từ khóa bổ sung để tìm kiếm */
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  onAction: (action: string) => void;
}

/* ═══════════════════════════════════════════════════════════
   Hằng số (Constants)
   ═══════════════════════════════════════════════════════════ */

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  navigation: 'Điều Hướng',
  action: 'Hành Động',
  recent: 'Gần Đây',
};

const CATEGORY_ORDER: CommandCategory[] = ['recent', 'navigation', 'action'];

/** Danh sách tất cả lệnh có sẵn */
const ALL_COMMANDS: CommandItem[] = [
  // ---- Điều hướng ----
  {
    id: 'nav-dashboard',
    label: 'Bảng Điều Khiển',
    description: 'Trang tổng quan dữ liệu và trạng thái',
    category: 'navigation',
    icon: LayoutDashboard,
    route: '/dashboard',
    shortcut: 'Ctrl+1',
    keywords: ['dashboard', 'tổng quan', 'home'],
  },
  {
    id: 'nav-ai-gen',
    label: 'Trình Tạo AI',
    description: 'Tạo nội dung với trí tuệ nhân tạo',
    category: 'navigation',
    icon: Sparkles,
    route: '/ai-gen',
    keywords: ['ai', 'generate', 'tạo', 'nội dung'],
  },
  {
    id: 'nav-latc',
    label: 'Kịch Bản LATC',
    description: 'Long-form Authority Thought Content',
    category: 'navigation',
    icon: FileText,
    route: '/latc',
    shortcut: 'Ctrl+2',
    keywords: ['latc', 'kịch bản', 'long form', 'script'],
  },
  {
    id: 'nav-tmt',
    label: 'Kịch Bản TMT',
    description: 'Trend Moment Topical Content',
    category: 'navigation',
    icon: FileText,
    route: '/tmt',
    shortcut: 'Ctrl+3',
    keywords: ['tmt', 'kịch bản', 'trend', 'topical'],
  },
  {
    id: 'nav-short-clips',
    label: 'Clip Ngắn',
    description: 'Video ngắn cho YouTube Shorts, TikTok, Reels',
    category: 'navigation',
    icon: Film,
    route: '/short-clips',
    shortcut: 'Ctrl+4',
    keywords: ['clip', 'shorts', 'video ngắn', 'reels', 'tiktok'],
  },
  {
    id: 'nav-social-posts',
    label: 'Bài Đăng MXH',
    description: 'Bài đăng mạng xã hội đa nền tảng',
    category: 'navigation',
    icon: MessageSquare,
    route: '/social-posts',
    shortcut: 'Ctrl+5',
    keywords: ['social', 'mxh', 'bài đăng', 'facebook', 'instagram'],
  },
  {
    id: 'nav-thumbs',
    label: 'Tiêu Đề & Thumbnail',
    description: 'Tạo tiêu đề và hình thu nhỏ cho video',
    category: 'navigation',
    icon: Image,
    route: '/thumbs',
    keywords: ['thumbnail', 'tiêu đề', 'hình', 'title'],
  },
  {
    id: 'nav-image-gen',
    label: 'Tạo Hình Ảnh',
    description: 'Tạo hình ảnh bằng AI',
    category: 'navigation',
    icon: ImagePlus,
    route: '/image-gen',
    keywords: ['image', 'hình ảnh', 'ai image', 'tạo hình'],
  },
  {
    id: 'nav-calendar',
    label: 'Lịch Nội Dung',
    description: 'Lên lịch đăng nội dung',
    category: 'navigation',
    icon: Calendar,
    route: '/calendar',
    keywords: ['calendar', 'lịch', 'lên lịch', 'đăng bài'],
  },
  {
    id: 'nav-analytics',
    label: 'Phân Tích YouTube',
    description: 'Báo cáo và phân tích hiệu quả kênh',
    category: 'navigation',
    icon: BarChart2,
    route: '/analytics',
    keywords: ['analytics', 'phân tích', 'youtube', 'báo cáo', 'thống kê'],
  },
  {
    id: 'nav-repurpose',
    label: 'Tái Sử Dụng',
    description: 'Chuyển đổi nội dung sang định dạng mới',
    category: 'navigation',
    icon: Recycle,
    route: '/repurpose',
    keywords: ['repurpose', 'tái sử dụng', 'chuyển đổi'],
  },
  {
    id: 'nav-funnels',
    label: 'Phễu & CTA',
    description: 'Quản lý phễu chuyển đổi và call-to-action',
    category: 'navigation',
    icon: Target,
    route: '/funnels',
    keywords: ['funnel', 'phễu', 'cta', 'chuyển đổi'],
  },
  {
    id: 'nav-brand',
    label: 'Brand Voice',
    description: 'Quy tắc giọng điệu thương hiệu',
    category: 'navigation',
    icon: Mic2,
    route: '/brand',
    keywords: ['brand', 'voice', 'thương hiệu', 'giọng điệu'],
  },
  {
    id: 'nav-settings',
    label: 'Cài Đặt',
    description: 'Cấu hình hệ thống và tài khoản',
    category: 'navigation',
    icon: Settings,
    route: '/settings',
    keywords: ['settings', 'cài đặt', 'cấu hình', 'tài khoản'],
  },

  // ---- Hành động ----
  {
    id: 'act-new-script',
    label: 'Tạo Kịch Bản Mới',
    description: 'Bắt đầu viết kịch bản mới từ đầu',
    category: 'action',
    icon: Plus,
    action: 'new_script',
    shortcut: 'Ctrl+N',
    keywords: ['tạo mới', 'new', 'kịch bản', 'script'],
  },
  {
    id: 'act-generate',
    label: 'Tạo Nội Dung AI',
    description: 'Sử dụng AI để tạo nội dung tự động',
    category: 'action',
    icon: Wand2,
    action: 'generate',
    shortcut: 'Ctrl+G',
    keywords: ['generate', 'ai', 'tạo', 'nội dung', 'tự động'],
  },
  {
    id: 'act-save',
    label: 'Lưu',
    description: 'Lưu nội dung hiện tại',
    category: 'action',
    icon: Save,
    action: 'save',
    shortcut: 'Ctrl+S',
    keywords: ['save', 'lưu', 'ghi'],
  },
  {
    id: 'act-export',
    label: 'Xuất File',
    description: 'Xuất nội dung ra file',
    category: 'action',
    icon: Download,
    action: 'export',
    keywords: ['export', 'xuất', 'file', 'download', 'tải về'],
  },
  {
    id: 'act-sync-youtube',
    label: 'Đồng Bộ YouTube',
    description: 'Đồng bộ dữ liệu từ kênh YouTube',
    category: 'action',
    icon: RefreshCw,
    action: 'sync_youtube',
    keywords: ['sync', 'youtube', 'đồng bộ', 'kênh'],
  },
  {
    id: 'act-repurpose',
    label: 'Tái Sử Dụng Nội Dung',
    description: 'Chuyển đổi nội dung hiện tại sang định dạng khác',
    category: 'action',
    icon: Recycle,
    action: 'repurpose',
    keywords: ['repurpose', 'tái sử dụng', 'chuyển đổi', 'nội dung'],
  },
  {
    id: 'act-brand-rules',
    label: 'Mở Brand Voice Rules',
    description: 'Xem và chỉnh sửa quy tắc giọng điệu',
    category: 'action',
    icon: BookOpen,
    action: 'brand_rules',
    keywords: ['brand', 'voice', 'rules', 'quy tắc', 'giọng điệu'],
  },
];

/** Số lượng kết quả tối đa hiển thị */
const MAX_VISIBLE_RESULTS = 10;

/** Khóa lưu trữ các hành động gần đây */
const RECENT_STORAGE_KEY = 'gem-command-palette-recent';

/** Số lượng hành động gần đây tối đa */
const MAX_RECENT = 5;

/* ═══════════════════════════════════════════════════════════
   Tiện ích (Utilities)
   ═══════════════════════════════════════════════════════════ */

/**
 * Tìm kiếm mờ (fuzzy) — trả về điểm số tương ứng.
 * Điểm càng cao càng khớp.
 * Trả về -1 nếu không khớp.
 */
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Khớp chính xác cho điểm cao nhất
  if (t === q) return 100;

  // Kiểm tra chứa chuỗi con
  if (t.includes(q)) return 80;

  // Tìm kiếm mờ: kiểm tra từng ký tự query có xuất hiện theo thứ tự trong text
  let qIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;

  for (let tIdx = 0; tIdx < t.length && qIdx < q.length; tIdx++) {
    if (t[tIdx] === q[qIdx]) {
      // Thưởng cho ký tự liên tiếp
      if (lastMatchIdx === tIdx - 1) {
        score += 10;
      } else {
        score += 5;
      }
      // Thưởng cho khớp ở đầu từ
      if (tIdx === 0 || t[tIdx - 1] === ' ') {
        score += 8;
      }
      lastMatchIdx = tIdx;
      qIdx++;
    }
  }

  // Tất cả ký tự query phải được tìm thấy
  if (qIdx < q.length) return -1;

  return score;
}

/**
 * Tạo mảng chỉ vị trí của các ký tự khớp để highlight.
 */
function getMatchIndices(query: string, text: string): number[] {
  const indices: number[] = [];
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  let qIdx = 0;
  for (let tIdx = 0; tIdx < t.length && qIdx < q.length; tIdx++) {
    if (t[tIdx] === q[qIdx]) {
      indices.push(tIdx);
      qIdx++;
    }
  }

  return indices;
}

/**
 * Lay danh sach ID lenh gan day tu localStorage.
 */
function getRecentCommandIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(0, MAX_RECENT);
    return [];
  } catch {
    return [];
  }
}

/**
 * Luu ID lenh vao danh sach gan day.
 */
function saveRecentCommandId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getRecentCommandIds();
    const updated = [id, ...current.filter((cid) => cid !== id)].slice(
      0,
      MAX_RECENT,
    );
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Bo qua loi localStorage
  }
}

/**
 * Chuyen doi chuoi phim tat thanh mang cac nhan hien thi.
 */
function formatShortcutParts(shortcut: string): string[] {
  return shortcut.split('+').map((part) => {
    const lower = part.toLowerCase();
    if (lower === 'ctrl') return 'Ctrl';
    if (lower === 'shift') return 'Shift';
    if (lower === 'alt') return 'Alt';
    return part.toUpperCase();
  });
}

/* ═══════════════════════════════════════════════════════════
   Thanh phan phu: HighlightedText
   ═══════════════════════════════════════════════════════════ */

function HighlightedText({
  text,
  matchIndices,
}: {
  text: string;
  matchIndices: number[];
}): React.JSX.Element {
  if (matchIndices.length === 0) {
    return <span>{text}</span>;
  }

  const matchSet = new Set(matchIndices);

  return (
    <span>
      {text.split('').map((char, idx) =>
        matchSet.has(idx) ? (
          <span key={idx} className="text-gold font-semibold">
            {char}
          </span>
        ) : (
          <span key={idx}>{char}</span>
        ),
      )}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   Thanh phan phu: CommandResultItem
   ═══════════════════════════════════════════════════════════ */

function CommandResultItem({
  item,
  isSelected,
  query,
  onSelect,
  onMouseEnter,
}: {
  item: CommandItem;
  isSelected: boolean;
  query: string;
  onSelect: (item: CommandItem) => void;
  onMouseEnter: () => void;
}): React.JSX.Element {
  const Icon = item.icon;
  const matchIndices = query ? getMatchIndices(query, item.label) : [];

  return (
    <button
      type="button"
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5',
        'text-left transition-colors duration-fast',
        'rounded-badge',
        isSelected
          ? 'bg-bg-3 text-txt'
          : 'text-txt-2 hover:bg-bg-3/50 hover:text-txt',
      )}
      onClick={() => onSelect(item)}
      onMouseEnter={onMouseEnter}
      role="option"
      aria-selected={isSelected}
    >
      {/* Biểu tượng lệnh */}
      <div
        className={cn(
          'flex-shrink-0 p-1.5 rounded-badge',
          isSelected ? 'bg-bg-4' : 'bg-bg-3/50',
        )}
      >
        <Icon
          size={16}
          className={cn(
            isSelected ? 'text-gold' : 'text-txt-3',
            'transition-colors duration-fast',
          )}
        />
      </div>

      {/* Nhan va mo ta */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          <HighlightedText text={item.label} matchIndices={matchIndices} />
        </div>
        {item.description && (
          <p className="text-xxs text-txt-3 truncate mt-0.5">
            {item.description}
          </p>
        )}
      </div>

      {/* Phim tat hoac mui ten */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {item.shortcut ? (
          formatShortcutParts(item.shortcut).map((part, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <span className="text-txt-3 text-xxs select-none">+</span>
              )}
              <kbd
                className={cn(
                  'inline-flex items-center justify-center',
                  'min-w-[20px] h-5 px-1',
                  'rounded-sm border border-border-2',
                  'bg-bg-4 text-txt-3 text-xxs font-mono',
                  'select-none',
                )}
              >
                {part}
              </kbd>
            </React.Fragment>
          ))
        ) : (
          <ArrowRight
            size={14}
            className={cn(
              'transition-opacity duration-fast',
              isSelected ? 'text-txt-3 opacity-100' : 'opacity-0',
            )}
          />
        )}
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   Thanh phan chinh: CommandPalette
   ═══════════════════════════════════════════════════════════ */

/**
 * Bang lenh nhanh (Command Palette) kieu VS Code / Linear.
 * Mo bang Ctrl+Shift+P hoac Ctrl+K.
 *
 * @example
 * ```tsx
 * <CommandPalette
 *   isOpen={showPalette}
 *   onClose={() => setShowPalette(false)}
 *   onNavigate={(route) => router.push(route)}
 *   onAction={(action) => handleAction(action)}
 * />
 * ```
 */
export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onAction,
}: CommandPaletteProps): React.JSX.Element | null {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Tai danh sach gan day khi mo
  useEffect(() => {
    if (isOpen) {
      setRecentIds(getRecentCommandIds());
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Auto-focus o tim kiem khi mo
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Khoa cuon trang khi mo
  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  // ── Tính toán kết quả tìm kiếm ──

  const filteredResults = useMemo((): CommandItem[] => {
    if (!query.trim()) {
      // Khi chưa nhập gì: hiển thị "Gần Đây" + tất cả lệnh
      const recentCommands: CommandItem[] = recentIds
        .map((id) => ALL_COMMANDS.find((cmd) => cmd.id === id))
        .filter((cmd): cmd is CommandItem => cmd !== undefined)
        .map((cmd) => ({ ...cmd, category: 'recent' as CommandCategory }));

      return [...recentCommands, ...ALL_COMMANDS];
    }

    // Tìm kiếm với điểm số fuzzy
    const scored = ALL_COMMANDS.map((cmd) => {
      const labelScore = fuzzyScore(query, cmd.label);
      const descScore = cmd.description
        ? fuzzyScore(query, cmd.description) * 0.6
        : -1;
      const keywordScore = cmd.keywords
        ? Math.max(...cmd.keywords.map((kw) => fuzzyScore(query, kw))) * 0.8
        : -1;

      const bestScore = Math.max(labelScore, descScore, keywordScore);
      return { cmd, score: bestScore };
    })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.cmd);

    return scored;
  }, [query, recentIds]);

  // Giới hạn kết quả hiển thị
  const visibleResults = filteredResults.slice(0, MAX_VISIBLE_RESULTS);

  // Reset vị trí chọn khi kết quả thay đổi
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // ── Phân nhóm kết quả theo danh mục ──

  const groupedResults = useMemo(() => {
    const groups: { category: CommandCategory; items: CommandItem[] }[] = [];
    const seenCategories = new Set<CommandCategory>();

    for (const item of visibleResults) {
      if (!seenCategories.has(item.category)) {
        seenCategories.add(item.category);
        groups.push({
          category: item.category,
          items: visibleResults.filter((i) => i.category === item.category),
        });
      }
    }

    // Sap xep theo thu tu danh muc da dinh nghia
    groups.sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) -
        CATEGORY_ORDER.indexOf(b.category),
    );

    return groups;
  }, [visibleResults]);

  // ── Xu ly chon lenh ──

  const handleSelectCommand = useCallback(
    (item: CommandItem) => {
      saveRecentCommandId(item.id);

      if (item.route) {
        onNavigate(item.route);
      } else if (item.action) {
        onAction(item.action);
      }

      onClose();
    },
    [onNavigate, onAction, onClose],
  );

  // ── Dieu huong bang phim ──

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < visibleResults.length - 1 ? prev + 1 : 0,
          );
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : visibleResults.length - 1,
          );
          break;
        }
        case 'Enter': {
          e.preventDefault();
          const selected = visibleResults[selectedIndex];
          if (selected) {
            handleSelectCommand(selected);
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
        }
        default:
          break;
      }
    },
    [visibleResults, selectedIndex, handleSelectCommand, onClose],
  );

  // Cuộn đến mục được chọn
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(
      '[aria-selected="true"]',
    ) as HTMLElement | null;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // ── Tinh toan vi tri tuyet doi cua muc trong danh sach phang ──
  let flatIndex = 0;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-command',
        'flex items-start justify-center pt-[15vh]',
        'animate-fade-in',
      )}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Bang lenh nhanh"
    >
      <div
        className={cn(
          'w-full max-w-xl mx-4',
          'rounded-card border border-border-2',
          'shadow-card-lg overflow-hidden',
          'animate-slide-up',
        )}
        style={{ background: '#0e0e16' }}
        onKeyDown={handleKeyDown}
      >
        {/* ── O tim kiem ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={18} className="text-txt-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhap lenh hoac tim kiem..."
            className={cn(
              'flex-1 bg-transparent',
              'text-md text-txt placeholder:text-txt-3',
              'outline-none border-none',
              'font-body',
            )}
            aria-label="Tim kiem lenh"
            aria-autocomplete="list"
            aria-controls="command-palette-results"
            aria-activedescendant={
              visibleResults[selectedIndex]
                ? `cmd-${visibleResults[selectedIndex].id}`
                : undefined
            }
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-sm text-txt-3 hover:text-txt hover:bg-bg-4 transition-all duration-fast"
              aria-label="Xoa tim kiem"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Danh sách kết quả ── */}
        <div
          ref={listRef}
          id="command-palette-results"
          className="max-h-[50vh] overflow-y-auto py-2"
          role="listbox"
          aria-label="Kết quả tìm kiếm"
        >
          {visibleResults.length === 0 ? (
            /* Trạng thái rỗng */
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <Search size={32} className="text-txt-3 mb-3 opacity-50" />
              <p className="text-sm text-txt-3 font-medium">
                Không tìm thấy kết quả
              </p>
              <p className="text-xxs text-txt-3 mt-1">
                Thử từ khóa khác hoặc kiểm tra chính tả
              </p>
            </div>
          ) : (
            /* Danh sách nhóm theo danh mục */
            groupedResults.map((group) => {
              const sectionItems = group.items;

              return (
                <div key={group.category} className="mb-1">
                  {/* Tieu de danh muc */}
                  <div className="px-4 pt-2 pb-1">
                    <span className="text-xxs font-semibold uppercase tracking-wider text-txt-3">
                      {CATEGORY_LABELS[group.category]}
                    </span>
                  </div>

                  {/* Cac muc trong danh muc */}
                  <div className="px-2">
                    {sectionItems.map((item) => {
                      const currentFlatIndex = flatIndex;
                      flatIndex++;

                      return (
                        <CommandResultItem
                          key={`${item.category}-${item.id}`}
                          item={item}
                          isSelected={currentFlatIndex === selectedIndex}
                          query={query}
                          onSelect={handleSelectCommand}
                          onMouseEnter={() =>
                            setSelectedIndex(currentFlatIndex)
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Chan trang -- Huong dan phim ── */}
        <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Huong dan di chuyen */}
            <div className="flex items-center gap-1.5">
              <kbd className="inline-flex items-center justify-center w-5 h-5 rounded-sm border border-border-2 bg-bg-3">
                <ArrowUp size={10} className="text-txt-3" />
              </kbd>
              <kbd className="inline-flex items-center justify-center w-5 h-5 rounded-sm border border-border-2 bg-bg-3">
                <ArrowDown size={10} className="text-txt-3" />
              </kbd>
              <span className="text-xxs text-txt-3 ml-0.5">
                Di chuyen
              </span>
            </div>

            {/* Huong dan chon */}
            <div className="flex items-center gap-1.5">
              <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded-sm border border-border-2 bg-bg-3">
                <CornerDownLeft size={10} className="text-txt-3" />
              </kbd>
              <span className="text-xxs text-txt-3 ml-0.5">Chon</span>
            </div>

            {/* Huong dan dong */}
            <div className="flex items-center gap-1.5">
              <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded-sm border border-border-2 bg-bg-3 text-xxs text-txt-3 font-mono">
                Esc
              </kbd>
              <span className="text-xxs text-txt-3 ml-0.5">Dong</span>
            </div>
          </div>

          {/* Nhan "Gan day" */}
          {!query && recentIds.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-txt-3" />
              <span className="text-xxs text-txt-3">
                {recentIds.length} lenh gan day
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
