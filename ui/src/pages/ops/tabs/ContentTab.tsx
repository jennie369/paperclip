// Tab 2: Nội Dung — cc_scripts CRUD + expand panel + editor + images + schedule + agent review

import { useState, useEffect, useRef, useMemo, useCallback, startTransition, memo, useDeferredValue } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check, X, Calendar, Copy, Trash2, Plus, ChevronDown, ChevronUp,
  Shield, Loader2, ExternalLink, Image, Send, Mail, FileCode, Eye, AlignLeft,
  Undo, Redo, Settings2, Search, MoreVertical, LayoutGrid, Filter, Bookmark, Clock, History,
  List, Columns3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { opsApi } from "@/api/ops";
import { SimpleModal } from "../../crm/components/SimpleModal";
import { useToast } from "@/context/ToastContext";
import { useNavigate, Link } from "@/lib/router";
import { supabase } from "@/lib/supabaseClient";
// BatchJobsView moved to ContentPipelinePage aigen tab (2026-04-18).
import { MarkdownBody } from "@/components/MarkdownBody";
// SSOT shared components — keep ContentTab/CCScriptDetail/CCAIGen UI consistent.
// Local definitions of MetaSelect/SlugUrlHandle removed 2026-05-17 (refactor commit).
import { MetaSelect, SlugUrlHandle } from "../../content-center/components";
// View switcher targets — kanban (GenericKanban SSOT) + calendar for the Nội Dung tab (2026-06-22).
import { ContentBoardView } from "./ContentBoardView";
import { ContentCalendarView } from "./ContentCalendarView";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(d?: string): string {
  if (!d) return '—';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 3600000) return Math.round(ms / 60000) + ' phút trước';
  if (ms < 86400000) return Math.round(ms / 3600000) + ' giờ trước';
  return Math.round(ms / 86400000) + ' ngày trước';
}

// Detect if content is HTML (email template etc.)
// Bắt các trường hợp:
// 1. Full HTML document: <!DOCTYPE html> hoặc <html ...>
// 2. HTML có <body>...</body>
// 3. HTML fragment: bắt đầu bằng <meta, <table, <div style=, <tr, <td (email templates không có DOCTYPE)
// 4. Code fence HTML: ```html ... ```
function isHtmlContent(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  const stripped = trimmed.startsWith('```')
    ? trimmed.replace(/^```\w*\n?/, '').replace(/\n?```\s*$/, '').trim()
    : trimmed;
  // Full document
  if (/^<!DOCTYPE html>/i.test(stripped)) return true;
  if (/^<html[\s>]/i.test(stripped)) return true;
  if (stripped.includes('<body') && stripped.includes('</body>')) return true;
  // HTML fragment — email templates thường bắt đầu bằng <meta hoặc comment rồi đến <table
  if (/^<meta\s/i.test(stripped)) return true;
  if (/^<!--[\s\S]*?-->\s*<(meta|table|div|tr|td|img|p)\b/i.test(stripped)) return true;
  // Có đủ dấu hiệu HTML: nhiều thẻ HTML và có style inline
  const tagCount = (stripped.match(/<\/?[a-z][a-z0-9]*[\s>]/gi) || []).length;
  if (tagCount >= 5 && /style\s*=/i.test(stripped)) return true;
  return false;
}

function stripCodeFence(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```\w*\n?/, '').replace(/\n?```\s*$/, '').trim();
  }
  return trimmed;
}

// Strip phần "AI nói chuyện" (preamble + conclusion) khỏi content/title.
// AI generation thường wrap content thực bằng câu mở đầu ("Em sẽ bắt đầu...",
// "Tuyệt vời, đây là...") + câu kết ("Hy vọng chị thích", "Em đợi feedback").
// Filter các pattern phổ biến — KHÔNG aggressive (chỉ match dòng đầu/cuối
// rõ ràng là AI talking, không touch content thực).
const AI_PREAMBLE_PATTERNS = [
  /^(em|tôi|ta)\s+(sẽ|đang|xin|đã|hiểu|sẵn sàng|bắt đầu)/i,
  /^(tuyệt vời|tuyệt!|được|ok|okay|hiểu rồi|chào chị)/i,
  /^(bắt đầu|trước tiên|đầu tiên|để bắt đầu|sau khi đọc|dựa trên|theo phân tích|theo yêu cầu)/i,
  /^(đây là|sau đây là|dưới đây là)\s+(bài|nội dung|kịch bản|caption)/i,
];
const AI_CONCLUSION_PATTERNS = [
  /^(hy vọng|mong rằng|em hy vọng|chị xem qua|em đợi|chờ phản hồi|chờ feedback|nếu chị|nếu cần)/i,
  /^(chúc chị|chúc bạn|cảm ơn chị|thanks)/i,
  /^---\s*$/,  // markdown horizontal rule sau content thực
];
function stripAiPreamble(text: string): string {
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  // Strip leading AI talking lines until first non-AI paragraph
  let start = 0;
  while (start < lines.length) {
    const ln = lines[start].trim();
    if (!ln) { start++; continue; }  // skip blank
    if (AI_PREAMBLE_PATTERNS.some(re => re.test(ln))) { start++; continue; }
    break;
  }
  // Strip trailing AI conclusion lines
  let end = lines.length;
  while (end > start) {
    const ln = lines[end - 1].trim();
    if (!ln) { end--; continue; }
    if (AI_CONCLUSION_PATTERNS.some(re => re.test(ln))) { end--; continue; }
    break;
  }
  return lines.slice(start, end).join('\n').trim();
}

// Strip AI talking từ title — title thường là 1 dòng.
// Pattern: "Đây là title: <real>", "Title: <real>", "Tiêu đề: <real>".
function stripAiTitlePrefix(title: string): string {
  if (!title) return '';
  let t = title.trim();
  // Remove common AI prefixes
  t = t.replace(/^(đây là\s+)?(tiêu đề|title|chủ đề|headline)\s*[:\-—]\s*/i, '');
  t = t.replace(/^(em|tôi|ta)\s+(đề xuất|gợi ý|đưa ra)\s*[:\-—]?\s*/i, '');
  // Strip surrounding quotes
  t = t.replace(/^["'""'']/, '').replace(/["'""'']$/, '');
  return t.trim();
}

// Tách phần IMAGE_PROMPT ra khỏi nội dung email trước khi gửi
function stripImagePrompt(html: string): string {
  // Dạng comment HTML: <!-- IMAGE_PROMPT: ... -->
  let result = html.replace(/<!--\s*IMAGE_PROMPT[\s\S]*?-->/gi, '');
  // Dạng text thô trong body: ===IMAGE_PROMPT=== hoặc —IMAGE_PROMPT—
  result = result.replace(/={2,}\s*IMAGE_PROMPT\s*={2,}[\s\S]*/gi, '');
  result = result.replace(/\u2014{1,}\s*IMAGE_PROMPT[\s\S]*/gi, '');
  // Dạng trong thẻ <p> hoặc <div> có chứa IMAGE_PROMPT
  result = result.replace(/<[^>]+>[^<]*IMAGE_PROMPT[\s\S]*?<\/(?:p|div|td|span)>/gi, '');
  return result.trim();
}

// Lấy phần IMAGE_PROMPT để hiển thị riêng
function extractImagePrompt(content: string): string {
  const match = content.match(/={2,}\s*IMAGE_PROMPT\s*={2,}([\s\S]*)/i)
    || content.match(/\u2014+\s*IMAGE_PROMPT([\s\S]*)/i);
  return match ? match[1].trim() : '';
}

function renderMarkdown(md: string): string {
  if (!md) return '';
  // escape HTML first
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // headings
  html = html
    .replace(/^### (.+)$/gm, '<h3 style="font-size:0.875rem;font-weight:600;margin:12px 0 4px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:1rem;font-weight:700;margin:16px 0 6px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:1.125rem;font-weight:700;margin:16px 0 8px">$1</h1>');
  // bold / italic
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
  // hashtags
  html = html.replace(/(^|\s)#([\wÀ-ỹ]+)/g, '$1<span style="color:#6366f1">#$2</span>');
  // paragraphs
  const parts = html.split(/\n\n+/);
  return parts.map(p => {
    if (/^<h[123]/.test(p.trimStart())) return p;
    return '<p style="margin-bottom:8px">' + p.replace(/\n/g, '<br/>') + '</p>';
  }).join('');
}

const statusLabels: Record<string, string> = {
  draft: 'Nháp', approved: 'Đã duyệt', rejected: 'Từ chối',
  published: 'Đã đăng', scheduled: 'Đã lên lịch',
};
const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-600',
  approved: 'bg-green-500/10 text-green-600',
  rejected: 'bg-red-500/10 text-red-600',
  published: 'bg-blue-500/10 text-blue-600',
  scheduled: 'bg-yellow-500/10 text-yellow-700',
};
const brandColors: Record<string, string> = {
  jennie: 'bg-pink-500/10 text-pink-600',
  generic: 'bg-violet-500/10 text-violet-600',
};

const defaultScheduleForm = { date: '', time: '10:00', account: 'profile_jennie' };
const defaultCreateForm = { title: '', body: '', pillar: 'trading', content_type: 'social_post', brand_voice: 'jennie' };

// ---------------------------------------------------------------------------
// EditableBadge — click để edit inline
// ---------------------------------------------------------------------------
const PILLAR_OPTIONS = ['trading', 'lifestyle', 'wellness', 'spiritual', 'education', 'migration'];

// Content type options: regular và tất cả email series IDs từ RESEND_TEMPLATE_REGISTRY.md
const CONTENT_TYPE_OPTIONS: { value: string; isDoc?: boolean; group?: string }[] = [
  // --- Regular content ---
  { value: 'social_post',    group: 'Regular' },
  { value: 'email',          group: 'Regular' },
  { value: 'newsletter',     group: 'Regular' },
  { value: 'newsletter_broadcast', group: 'Regular' },
  { value: 'blog',           group: 'Regular' },
  { value: 'short_video',    group: 'Regular' },
  { value: 'reel',           group: 'Regular' },
  { value: 'story',          group: 'Regular' },
  { value: 'thread',         group: 'Regular' },
  { value: 'podcast_script', group: 'Regular' },
  { value: 'webinar_script', group: 'Regular' },
  // --- A1. onb-trading-starter (DOC-ONB-001) ---
  { value: 'onb-trading-starter-e1', isDoc: true, group: 'onb-trading-starter' },
  { value: 'onb-trading-starter-e2', isDoc: true, group: 'onb-trading-starter' },
  { value: 'onb-trading-starter-e3', isDoc: true, group: 'onb-trading-starter' },
  { value: 'onb-trading-starter-e4', isDoc: true, group: 'onb-trading-starter' },
  { value: 'onb-trading-starter-e5', isDoc: true, group: 'onb-trading-starter' },
  // --- A2. onb-trading-tier1 (DOC-ONB-002) ---
  { value: 'onb-trading-tier1-e1', isDoc: true, group: 'onb-trading-tier1' },
  { value: 'onb-trading-tier1-e2', isDoc: true, group: 'onb-trading-tier1' },
  { value: 'onb-trading-tier1-e3', isDoc: true, group: 'onb-trading-tier1' },
  { value: 'onb-trading-tier1-e4', isDoc: true, group: 'onb-trading-tier1' },
  { value: 'onb-trading-tier1-e5', isDoc: true, group: 'onb-trading-tier1' },
  { value: 'onb-trading-tier1-e6', isDoc: true, group: 'onb-trading-tier1' },
  { value: 'onb-trading-tier1-e7', isDoc: true, group: 'onb-trading-tier1' },
  // --- A3. onb-trading-tier2 (DOC-ONB-003) ---
  { value: 'onb-trading-tier2-e1', isDoc: true, group: 'onb-trading-tier2' },
  { value: 'onb-trading-tier2-e2', isDoc: true, group: 'onb-trading-tier2' },
  { value: 'onb-trading-tier2-e3', isDoc: true, group: 'onb-trading-tier2' },
  { value: 'onb-trading-tier2-e4', isDoc: true, group: 'onb-trading-tier2' },
  { value: 'onb-trading-tier2-e5', isDoc: true, group: 'onb-trading-tier2' },
  { value: 'onb-trading-tier2-e6', isDoc: true, group: 'onb-trading-tier2' },
  { value: 'onb-trading-tier2-e7', isDoc: true, group: 'onb-trading-tier2' },
  // --- A4. onb-trading-tier3 (DOC-ONB-004) ---
  { value: 'onb-trading-tier3-e1', isDoc: true, group: 'onb-trading-tier3' },
  { value: 'onb-trading-tier3-e2', isDoc: true, group: 'onb-trading-tier3' },
  { value: 'onb-trading-tier3-e3', isDoc: true, group: 'onb-trading-tier3' },
  { value: 'onb-trading-tier3-e4', isDoc: true, group: 'onb-trading-tier3' },
  { value: 'onb-trading-tier3-e5', isDoc: true, group: 'onb-trading-tier3' },
  { value: 'onb-trading-tier3-e6', isDoc: true, group: 'onb-trading-tier3' },
  { value: 'onb-trading-tier3-e7', isDoc: true, group: 'onb-trading-tier3' },
  // --- A5. onb-tinh-yeu (DOC-ONB-005) ---
  { value: 'onb-tinh-yeu-e1', isDoc: true, group: 'onb-tinh-yeu' },
  { value: 'onb-tinh-yeu-e2', isDoc: true, group: 'onb-tinh-yeu' },
  { value: 'onb-tinh-yeu-e3', isDoc: true, group: 'onb-tinh-yeu' },
  { value: 'onb-tinh-yeu-e4', isDoc: true, group: 'onb-tinh-yeu' },
  { value: 'onb-tinh-yeu-e5', isDoc: true, group: 'onb-tinh-yeu' },
  { value: 'onb-tinh-yeu-e6', isDoc: true, group: 'onb-tinh-yeu' },
  // --- A6. onb-trieu-phu (DOC-ONB-006) ---
  { value: 'onb-trieu-phu-e1', isDoc: true, group: 'onb-trieu-phu' },
  { value: 'onb-trieu-phu-e2', isDoc: true, group: 'onb-trieu-phu' },
  { value: 'onb-trieu-phu-e3', isDoc: true, group: 'onb-trieu-phu' },
  { value: 'onb-trieu-phu-e4', isDoc: true, group: 'onb-trieu-phu' },
  { value: 'onb-trieu-phu-e5', isDoc: true, group: 'onb-trieu-phu' },
  { value: 'onb-trieu-phu-e6', isDoc: true, group: 'onb-trieu-phu' },
  { value: 'onb-trieu-phu-e7', isDoc: true, group: 'onb-trieu-phu' },
  // --- A7. onb-7-ngay-tan-so-goc (DOC-ONB-007) ---
  { value: 'onb-7-ngay-tan-so-goc-e1', isDoc: true, group: 'onb-7-ngay' },
  { value: 'onb-7-ngay-tan-so-goc-e2', isDoc: true, group: 'onb-7-ngay' },
  { value: 'onb-7-ngay-tan-so-goc-e3', isDoc: true, group: 'onb-7-ngay' },
  { value: 'onb-7-ngay-tan-so-goc-e4', isDoc: true, group: 'onb-7-ngay' },
  { value: 'onb-7-ngay-tan-so-goc-e5', isDoc: true, group: 'onb-7-ngay' },
  { value: 'onb-7-ngay-tan-so-goc-e6', isDoc: true, group: 'onb-7-ngay' },
  { value: 'onb-7-ngay-tan-so-goc-e7', isDoc: true, group: 'onb-7-ngay' },
  // --- A8. onb-ctv-kol (DOC-ONB-008) ---
  { value: 'onb-ctv-kol-e1', isDoc: true, group: 'onb-ctv-kol' },
  { value: 'onb-ctv-kol-e2', isDoc: true, group: 'onb-ctv-kol' },
  { value: 'onb-ctv-kol-e3', isDoc: true, group: 'onb-ctv-kol' },
  { value: 'onb-ctv-kol-e4', isDoc: true, group: 'onb-ctv-kol' },
  { value: 'onb-ctv-kol-e5', isDoc: true, group: 'onb-ctv-kol' },
  // --- B1. welcome-free-signup ---
  { value: 'welcome-free-signup-e1', isDoc: true, group: 'welcome' },
  { value: 'welcome-free-signup-e2', isDoc: true, group: 'welcome' },
  { value: 'welcome-free-signup-e3', isDoc: true, group: 'welcome' },
  // --- B2. winback-dormant ---
  { value: 'winback-dormant-e1', isDoc: true, group: 'winback' },
  { value: 'winback-dormant-e2', isDoc: true, group: 'winback' },
  { value: 'winback-dormant-e3', isDoc: true, group: 'winback' },
  // --- D1. VIP ---
  { value: 'vip-personal-touch', isDoc: true, group: 'vip' },
];

const STATUS_OPTIONS = ['draft', 'approved', 'rejected', 'published', 'scheduled'];
const BRAND_OPTIONS = ['jennie', 'generic'];

// ---------------------------------------------------------------------------
// ContentTypeDropdown — custom popover với search, tránh freeze
// ---------------------------------------------------------------------------
function ContentTypeDropdown({
  value, options, onSelect, onClose, anchorRect,
}: {
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  onClose: () => void;
  anchorRect: DOMRect;
}) {
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // pos tính thẳng từ anchorRect — không cần useEffect, không có delay
  const pos = { top: anchorRect.bottom + 4, left: anchorRect.left };

  // Click outside
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  // Key: Escape đóng
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const q = search.toLowerCase();
  // Giới hạn 30 items khi chưa search — tránh render 70 nodes cùng lúc gây freeze
  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(q))
    : options.slice(0, 30);

  // Group lại để hiển thị header
  const grouped: { group: string; items: string[] }[] = [];
  const groupMap = new Map<string, string[]>();
  for (const o of filtered) {
    const meta = CONTENT_TYPE_OPTIONS.find(c => c.value === o);
    const g = meta?.group ?? 'Khác';
    if (!groupMap.has(g)) groupMap.set(g, []);
    groupMap.get(g)!.push(o);
  }
  groupMap.forEach((items, group) => grouped.push({ group, items }));

  // createPortal → render thẳng vào document.body
  // Fix: dnd-kit inject transform vào draggable rows → position:fixed bị lệch
  // Portal bypass hoàn toàn mọi CSS stacking context của parent
  return createPortal(
    <div
      ref={popoverRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999, minWidth: 220, maxHeight: 320 }}
      className="bg-popover border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Search */}
      <div className="px-2 py-1.5 border-b border-border shrink-0">
        <input
          autoFocus
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm... (gõ để lọc tất cả)"
          className="w-full text-[11px] bg-transparent outline-none placeholder:text-muted-foreground/50"
        />
      </div>
      {/* List */}
      <div className="overflow-y-auto flex-1">
        {!search && (
          <div className="px-2 py-1 text-[9px] text-muted-foreground/40 italic">Hiện 30 đầu · gõ để tìm tất cả</div>
        )}
        {grouped.length === 0 && (
          <div className="px-3 py-2 text-[11px] text-muted-foreground">Không tìm thấy</div>
        )}
        {grouped.map(({ group, items }) => (
          <div key={group}>
            <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold bg-muted/30 sticky top-0">
              {group}
            </div>
            {items.map(o => {
              const meta = CONTENT_TYPE_OPTIONS.find(c => c.value === o);
              const isDoc = meta?.isDoc ?? false;
              const isSelected = o === value;
              return (
                <button
                  key={o}
                  type="button"
                  className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 hover:bg-accent/60 transition-colors ${isSelected ? 'bg-accent' : ''}`}
                  onClick={() => { onSelect(o); onClose(); }}
                >
                  {isDoc ? (
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded text-[10px] bg-zinc-900 text-white">{o}</span>
                  ) : (
                    <span className={isSelected ? 'font-semibold' : ''}>{o}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}

function EditableBadge({
  value, options, onSave, className, isText = false, placeholder,
}: {
  value: string;
  options?: string[];
  onSave: (v: string) => void;
  className?: string;
  isText?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  // anchorRect: capture ngay tại onClick trước khi React re-render (unmount badge span)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const commit = (v: string) => {
    onSave(v.trim() || value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        className={`cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all ${className}`}
        title="Click để chỉnh sửa"
        onClick={(e) => {
          e.stopPropagation();
          // Capture rect trước setEditing — lúc này DOM vẫn ở đúng vị trí
          setAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
          setDraft(value);
          setEditing(true);
        }}
      >
        {value || placeholder || '—'}
      </span>
    );
  }

  // Text input mode
  if (isText || !options) {
    return (
      <span onClick={(e) => e.stopPropagation()} className="inline-block">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(draft); if (e.key === 'Escape') { setEditing(false); setDraft(value); } }}
          placeholder={placeholder}
          className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 border rounded focus:outline-none focus:ring-1 focus:ring-primary/40 w-28 ${className}`}
        />
      </span>
    );
  }

  // Dropdown: ContentTypeDropdown với anchorRect đã capture sẵn từ onClick
  if (!anchorRect) return null;
  return (
    <span onClick={(e) => e.stopPropagation()} className="relative inline-block">
      <ContentTypeDropdown
        value={value}
        options={options}
        onSelect={commit}
        onClose={() => { setEditing(false); setDraft(value); }}
        anchorRect={anchorRect}
      />
    </span>
  );
}

// Lấy tiêu đề email hợp lệ: nếu title là HTML thì extract từ thẻ <title>, nếu không trả về title thường
function getEmailSubject(script: any): string {
  const rawTitle = script.title || '';
  // Nếu title trông giống HTML (DOCTYPE hoặc <html) thì bỏ qua
  if (/^<!DOCTYPE/i.test(rawTitle.trim()) || /^<html/i.test(rawTitle.trim())) {
    // Thử extract từ body HTML
    const body = script.body || script.caption || script.content || '';
    const m = body.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m ? m[1].trim() : '';
  }
  // Nếu title bị bắt đầu bằng <! hoặc < khác thì cũng bỏ qua
  if (rawTitle.trim().startsWith('<')) return '';
  return rawTitle;
}

// ---------------------------------------------------------------------------
// MetadataEditor — editable grid of all cc_scripts fields with DB column tooltips
// ---------------------------------------------------------------------------

const BLOG_CATEGORY_OPTIONS = ['Nghiên Cứu', 'Tài Chính', 'Sức Khỏe', 'Trading', 'Lifestyle', 'Giáo Dục', 'Âm Nhạc'];
// Must match cc_scripts.publish_mode CHECK constraint (scheduled/immediate/threshold_5/schedule2week).
const PUBLISH_MODE_OPTIONS = ['immediate', 'scheduled', 'threshold_5', 'schedule2week'];
// Must match poster FACEBOOK_ACCOUNTS keys + forum/push/email/resend routes (scripts/PIPELINE_ACCOUNTS_CONFIG.py).
const ACCOUNT_OPTIONS = ['page_jennie', 'page_gemral', 'profile_jennie', 'page_yinyang', 'forum', 'push', 'email', 'resend'];
// Resend segment names (verify via mcp__resend__list-segments). Server maps name → audience UUID.
const RESEND_SEGMENT_NAMES = ['active_customer', 'partner_ctv', 'vip_high_spender', 'dormant', 'new_signup', 'Waitlist Leads', 'Test'];
const RESEND_DEFAULT_SEGMENTS = ['active_customer', 'partner_ctv'];
const RESEND_FROM_OPTIONS = ['hello@gemral.com', 'jennie@gemral.com', 'partnership@gemral.com'];

// scheduled_at is stored as timestamptz. The datetime-local picker shows/accepts
// HCM (UTC+7) wall-clock time per project timezone rule — convert on both ends so
// the picked time is the actual publish time, not a 7h-shifted UTC value.
function isoToHcmLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hcm = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return hcm.toISOString().slice(0, 16);
}
function hcmLocalToISO(local: string): string {
  if (!local) return '';
  const withSec = local.length === 16 ? `${local}:00` : local;
  return `${withSec}+07:00`;
}

function MetaField({
  label, dbCol, children, className,
}: { label: string; dbCol: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className ?? ''}`}>
      <label
        className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1 cursor-help"
        title={`DB column: cc_scripts.${dbCol}`}
      >
        {label}
        <span className="text-[8px] text-muted-foreground/30 font-normal normal-case tracking-normal">↔ {dbCol}</span>
      </label>
      {children}
    </div>
  );
}

function MetaInput({
  value, onCommit, placeholder, type = 'text', mono = false, validate,
}: { value: string; onCommit: (v: string) => void; placeholder?: string; type?: string; mono?: boolean; validate?: (v: string) => string | null }) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setDraft(value); setError(null); }, [value]);

  const commit = () => { 
    if (draft !== value) {
      if (validate) {
        const err = validate(draft);
        if (err) {
          setError(err);
          return;
        }
      }
      setError(null);
      onCommit(draft); 
    } 
  };

  return (
    <div className="relative pb-0.5">
      <input
        type={type}
        value={draft}
        onChange={e => {
          setDraft(e.target.value);
          if (error && validate) setError(validate(e.target.value));
        }}
        onBlur={commit}
        onKeyDown={e => { 
          if (e.key === 'Enter') { 
            commit(); 
            if (!validate || !validate(draft)) (e.target as HTMLInputElement).blur(); 
          } 
          if (e.key === 'Escape') { 
            setDraft(value); 
            setError(null); 
          } 
        }}
        placeholder={placeholder}
        className={`w-full text-[11px] px-2 py-1 border rounded bg-white focus:outline-none focus:ring-1 ${error ? 'border-destructive focus:ring-destructive/30' : 'focus:ring-primary/30'} ${mono ? 'font-mono' : ''}`}
      />
      {error && <div className="absolute top-full mt-0.5 left-0 text-[9px] text-destructive leading-tight">{error}</div>}
    </div>
  );
}

function MetadataEditor({
  script, onUpdate, wordCount, readTime,
}: { script: any; onUpdate: (patch: Record<string, any>) => Promise<void>; wordCount: number; readTime: number }) {
  const [open, setOpen] = useState(false);
  const meta = script.metadata || {};

  // --- Metadata Undo/Redo ---
  const metaUndoStack = useRef<Record<string, any>[]>([]);
  const metaRedoStack = useRef<Record<string, any>[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const save = (field: string) => (val: string) => {
    // Snapshot current value before update
    metaUndoStack.current.push({ [field]: script[field] ?? null });
    if (metaUndoStack.current.length > 30) metaUndoStack.current.shift();
    metaRedoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
    return onUpdate({ [field]: val || null });
  };

  const handleMetaUndo = useCallback(async () => {
    if (metaUndoStack.current.length === 0) return;
    const prev = metaUndoStack.current.pop()!;
    // Build redo snapshot from current state
    const redoPatch: Record<string, any> = {};
    for (const k of Object.keys(prev)) redoPatch[k] = script[k] ?? null;
    metaRedoStack.current.push(redoPatch);
    setCanUndo(metaUndoStack.current.length > 0);
    setCanRedo(true);
    await onUpdate(prev);
  }, [script, onUpdate]);

  const handleMetaRedo = useCallback(async () => {
    if (metaRedoStack.current.length === 0) return;
    const next = metaRedoStack.current.pop()!;
    const undoPatch: Record<string, any> = {};
    for (const k of Object.keys(next)) undoPatch[k] = script[k] ?? null;
    metaUndoStack.current.push(undoPatch);
    setCanUndo(true);
    setCanRedo(metaRedoStack.current.length > 0);
    await onUpdate(next);
  }, [script, onUpdate]);

  const saveArr = (field: string) => (val: string) =>
    onUpdate({ [field]: val ? val.split(',').map((s: string) => s.trim()).filter(Boolean) : null });

  // Merge a single key into cc_scripts.metadata (jsonb) without losing other keys.
  const saveMeta = (key: string, val: any) => onUpdate({ metadata: { ...(script.metadata || {}), [key]: val } });

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      {/* Header row — always visible summary + toggle */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          <span className="font-mono font-semibold text-zinc-700">{script.id?.substring(0, 8)}…</span>
          <span className="opacity-40">·</span>
          <span>{wordCount} từ · ~{readTime} phút</span>
          {script.content_type && <><span className="opacity-40">·</span><span className="font-mono bg-zinc-100 px-1 rounded">{script.content_type}</span></>}
          {script.pillar && <><span className="opacity-40">·</span><span>{script.pillar}</span></>}
          {script.brand_voice && <><span className="opacity-40">·</span><span>Voice: {script.brand_voice}</span></>}
          {script.blog_category && <><span className="opacity-40">·</span><span>{script.blog_category}</span></>}
          {script.posted_account && <><span className="opacity-40">·</span><span className="text-blue-500">{script.posted_account}</span></>}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Metadata Undo/Redo toolbar — hiện khi panel mở */}
      {open && (canUndo || canRedo) && (
        <div className="flex items-center gap-1 px-3 py-1 border-b bg-amber-50/50 text-[10px] text-muted-foreground">
          <span className="text-amber-600 font-medium">Metadata history:</span>
          <button
            onClick={handleMetaUndo}
            disabled={!canUndo}
            title="Undo thay đổi metadata (Ctrl+Z)"
            className="px-2 py-0.5 rounded border border-border/50 disabled:opacity-30 hover:bg-muted transition-colors"
          >↩ Undo</button>
          <button
            onClick={handleMetaRedo}
            disabled={!canRedo}
            title="Redo thay đổi metadata (Ctrl+Y)"
            className="px-2 py-0.5 rounded border border-border/50 disabled:opacity-30 hover:bg-muted transition-colors"
          >↪ Redo</button>
          <span className="ml-auto opacity-50">{metaUndoStack.current.length} bước có thể undo</span>
        </div>
      )}
      {/* Collapsible detail grid */}
      {open && (
        <div className="border-t px-3 py-3 grid grid-cols-2 gap-x-4 gap-y-3" onClick={e => e.stopPropagation()}>
          {/* Row 1 */}
          <MetaField label="Trạng thái" dbCol="status">
            <MetaSelect value={script.status || ''} options={STATUS_OPTIONS} onCommit={save('status')} />
          </MetaField>
          <MetaField label="Content Type" dbCol="content_type">
            <MetaSelect 
              value={script.content_type || ''} 
              options={CONTENT_TYPE_OPTIONS.map(c => c.value)} 
              onCommit={save('content_type')} 
              allowCustom 
              storageKey="content_type" 
            />
          </MetaField>

          {/* Row 2 */}
          <MetaField label="Pillar" dbCol="pillar">
            <MetaSelect value={script.pillar || ''} options={PILLAR_OPTIONS} onCommit={save('pillar')} allowCustom storageKey="pillar" />
          </MetaField>
          <MetaField label="Brand Voice" dbCol="brand_voice">
            <MetaSelect value={script.brand_voice || ''} options={BRAND_OPTIONS} onCommit={save('brand_voice')} storageKey="brand_voice" />
          </MetaField>

          {/* Row 3 — Blog fields */}
          <MetaField label="Blog Category" dbCol="blog_category">
            <MetaSelect value={script.blog_category || ''} options={BLOG_CATEGORY_OPTIONS} onCommit={save('blog_category')} allowCustom storageKey="blog_category" />
          </MetaField>
          <MetaField label="Blog Tags" dbCol="blog_tags">
            <MetaSelect 
              value={(script.blog_tags || []).join(', ')} 
              options={['wealth', 'wellness', 'spiritual']} 
              onCommit={saveArr('blog_tags')} 
              allowCustom 
              storageKey="blog_tags" 
              placeholder="vd: wealth, wellness" 
            />
          </MetaField>

          {/* Row 4 — Slug + URL Handle */}
          <MetaField label="Slug" dbCol="slug" className="">
            <div className="flex gap-1">
              <div className="flex-1">
                <MetaInput 
                  value={script.slug || ''} 
                  onCommit={save('slug')} 
                  placeholder={script.title ? script.title.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : "vd: 7-luan-xa-tien-bac"} 
                  mono 
                  validate={(v) => {
                    if (v && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)) return "Chỉ dùng chữ thường, số, và dấu gạch ngang (-)";
                    return null;
                  }}
                />
              </div>
              {!script.slug && script.title && (
                <button 
                  onClick={() => save('slug')(script.title.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))} 
                  className="px-2 h-[26px] bg-primary text-primary-foreground text-[10px] rounded hover:bg-primary/90 shrink-0 border-none"
                  title="Tạo slug tự động từ tiêu đề"
                >
                  Tạo Slug
                </button>
              )}
            </div>
          </MetaField>
          <MetaField label="Excerpt (tóm tắt SEO)" dbCol="excerpt">
            <MetaSelect 
              value={script.excerpt || ''} 
              options={[]} 
              onCommit={save('excerpt')} 
              allowCustom 
              storageKey="excerpt" 
              placeholder="Tóm tắt ngắn cho SEO / meta description" 
            />
          </MetaField>
          {/* URL Handle — auto-derived from slug, full row */}
          {script.slug && (
            <div className="col-span-2">
              <SlugUrlHandle slug={script.slug} contentType={script.content_type} />
            </div>
          )}


          {/* Row 5 — Publish */}
          <MetaField label="Posted Account" dbCol="posted_account">
            <MetaSelect value={script.posted_account || ''} options={ACCOUNT_OPTIONS} onCommit={save('posted_account')} allowCustom storageKey="posted_account" />
          </MetaField>
          <MetaField label="Publish Mode" dbCol="publish_mode">
            <MetaSelect value={script.publish_mode || ''} options={PUBLISH_MODE_OPTIONS} onCommit={save('publish_mode')} storageKey="publish_mode" />
          </MetaField>

          {/* Row 6 */}
          <MetaField label="Scheduled At" dbCol="scheduled_at">
            <MetaInput value={isoToHcmLocal(script.scheduled_at)} onCommit={(v: string) => save('scheduled_at')(hcmLocalToISO(v))} type="datetime-local" />
          </MetaField>

          {/* Row 7 — Read-only stats */}
          <MetaField label="Số từ" dbCol="word_count" className="col-span-2">
            <span className="text-[11px] text-muted-foreground">{wordCount} từ · ~{readTime} phút đọc</span>
          </MetaField>
        </div>
      )}

      {/* Newsletter (Resend) — chỉ hiện khi posted_account = resend */}
      {open && script.posted_account === 'resend' && (
        <div className="mt-3 rounded-lg border border-amber-300/50 bg-amber-50/50 p-3 space-y-2.5">
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Newsletter (Resend Broadcast)</p>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Chọn các segment muốn gửi (chọn nhiều, 1 lần). Bấm <b>Đăng ngay / Lên lịch</b> 1 lần → tự gửi tới TẤT CẢ segment đã chọn (mỗi segment = 1 broadcast Resend, tự động — không cần bấm lại).
          </p>
          {(() => {
            const sel: string[] = (Array.isArray(meta.resend_segments) && meta.resend_segments.length)
              ? meta.resend_segments : RESEND_DEFAULT_SEGMENTS;
            return (
              <div className="flex flex-wrap gap-1.5">
                {RESEND_SEGMENT_NAMES.map((seg) => {
                  const on = sel.includes(seg);
                  return (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => {
                        const next = on ? sel.filter((s) => s !== seg) : [...sel, seg];
                        saveMeta('resend_segments', next);
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition ${on ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-muted-foreground border-zinc-200 hover:border-amber-300'}`}
                    >
                      {on ? '✓ ' : ''}{seg}
                    </button>
                  );
                })}
              </div>
            );
          })()}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <MetaField label="Email Subject" dbCol="metadata.email_subject">
              <MetaInput value={meta.email_subject || ''} onCommit={(v: string) => saveMeta('email_subject', v || null)} placeholder="Trống → dùng tiêu đề bài" />
            </MetaField>
            <MetaField label="From Email" dbCol="metadata.from_email">
              <MetaSelect value={meta.from_email || ''} options={RESEND_FROM_OPTIONS} onCommit={(v: string) => saveMeta('from_email', v || null)} allowCustom />
            </MetaField>
            <MetaField label="Preview Text" dbCol="metadata.preview_text" className="col-span-2">
              <MetaInput value={meta.preview_text || ''} onCommit={(v: string) => saveMeta('preview_text', v || null)} placeholder="Preview text (tùy chọn)" />
            </MetaField>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScriptExpandedPanel
// ---------------------------------------------------------------------------

function ScriptExpandedPanel({ script, customTag = '' }: { script: any; customTag?: string }) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');

  // useMemo: chỉ tính 1 lần khi script.id thay đổi — tránh gọi regex nặng mỗi render
  const initialBody = useMemo(
    () => stripAiPreamble(script.body || script.caption || script.content || ''),
    [script.id] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const initialTitle = useMemo(
    () => stripAiTitlePrefix(script.title || ''),
    [script.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [body, setBody] = useState(() => initialBody);
  const [title, setTitle] = useState(() => initialTitle);
  const [saving, setSaving] = useState(false);

  // Undo/Redo custom history
  const [history, setHistory] = useState<{t: string, b: string}[]>([{ t: initialTitle, b: initialBody }]);
  const [hIndex, setHIndex] = useState(0);

  // Save to history debounce
  useEffect(() => {
    const tId = setTimeout(() => {
      if (history[hIndex].b !== body || history[hIndex].t !== title) {
        setHistory(prev => {
          const newH = prev.slice(0, hIndex + 1);
          newH.push({ t: title, b: body });
          // Limit to 50 steps
          if (newH.length > 50) newH.shift();
          return newH;
        });
        setHIndex(prev => Math.min(prev + 1, 50));
      }
    }, 600);
    return () => clearTimeout(tId);
  }, [body, title, hIndex, history]);

  const handleUndo = () => {
    if (hIndex > 0) {
      const prev = hIndex - 1;
      setHIndex(prev);
      setBody(history[prev].b);
      setTitle(history[prev].t);
    }
  };
  const handleRedo = () => {
    if (hIndex < history.length - 1) {
      const next = hIndex + 1;
      setHIndex(next);
      setBody(history[next].b);
      setTitle(history[next].t);
    }
  };
  // 'saved' | 'unsaved' | 'saving' — indicator auto-save
  const [saveState, setSaveState] = useState<'saved' | 'unsaved' | 'saving'>('saved');

  // deferredBody: React render markdown/iframe với giá trị cũ (không block)
  // trong khi mode button click phản hồi ngay lập tức — giảm cảm giác freeze.
  // MUST be after useState(body) to avoid TDZ (Temporal Dead Zone)
  const deferredBody = useDeferredValue(body);

  // Sync body + title when script id changes (e.g. different row expanded)
  useEffect(() => {
    setBody(initialBody);
    setTitle(initialTitle);
    setSaveState('saved');
  }, [initialBody, initialTitle]);

  // Toggle mode dùng startTransition → không block main thread
  const handleSetMode = useCallback((m: 'preview' | 'edit') => {
    startTransition(() => setMode(m));
  }, []);

  const inv = () => qc.invalidateQueries({ queryKey: ['ops'] });

  const doSave = useCallback(async (t: string, b: string) => {
    setSaving(true);
    setSaveState('saving');
    try {
      const payload: Record<string, any> = { body: b };
      const trimmedTitle = t.trim();
      if (trimmedTitle && trimmedTitle !== (script.title || '').trim()) {
        payload.title = trimmedTitle;
      }
      await opsApi.updateScript(script.id, payload);
      inv();
      setSaveState('saved');
    } catch {
      pushToast({ title: 'Lỗi lưu nội dung', tone: 'error' });
      setSaveState('unsaved');
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script.id]);

  // Auto-save debounce 1.5s sau khi user dừng gõ
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Không auto-save nếu content chưa thay đổi so với DB
    if (body === initialBody && title === initialTitle) return;
    setSaveState('unsaved');
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      doSave(title, body);
    }, 1500);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, title]);

  const handleSave = () => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    doSave(title, body);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(body)
      .then(() => pushToast({ title: 'Đã sao chép nội dung', tone: 'success' }))
      .catch(() => {});
  };

  // Optimistic previews while uploading (objectURL) → thumbnail hiện ngay.
  const [uploadingPreviews, setUploadingPreviews] = useState<{ id: string; url: string }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const uploadOne = async (file: File): Promise<string | null> => {
    const path = `cc-images/${script.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${file.name}`;
    for (const bucket of ['cc-content', 'content', 'public']) {
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (!error) return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    if (file.size <= 1_000_000) {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    return null;
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    // Show thumbnails ngay lập tức (local objectURL) — chị biết đã pick thành công.
    const previews = files.map((f) => ({ id: `${Date.now()}-${Math.random()}`, url: URL.createObjectURL(f) }));
    setUploadingPreviews((prev) => [...prev, ...previews]);
    const uploaded: string[] = [];
    let tooBig = 0;
    for (const f of files) {
      const url = await uploadOne(f);
      if (url) uploaded.push(url); else tooBig++;
    }
    if (uploaded.length) {
      const newUrls = [...(script.image_urls || []), ...uploaded];
      try {
        await opsApi.updateScript(script.id, { image_urls: newUrls });
        inv();
      } catch {
        pushToast({ title: 'Lỗi lưu ảnh', tone: 'error' });
      }
    }
    setUploadingPreviews((prev) => prev.filter((p) => !previews.some((x) => x.id === p.id)));
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    if (uploaded.length) pushToast({ title: `Đã thêm ${uploaded.length} ảnh`, tone: 'success' });
    if (tooBig) pushToast({ title: `${tooBig} ảnh fail (quá 1MB + bucket lỗi)`, tone: 'error' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) await handleFiles(e.target.files);
    e.target.value = '';
  };

  const saveFirstComment = async (val: string) => {
    try {
      await opsApi.updateScript(script.id, { metadata: { ...(script.metadata || {}), first_comment: val || null } });
      inv();
    } catch { pushToast({ title: 'Lỗi lưu comment', tone: 'error' }); }
  };

  // Order of image_urls IS the post order (poster uploads array order 1→N).
  const persistImages = async (next: string[]) => {
    try {
      await opsApi.updateScript(script.id, { image_urls: next });
      inv();
    } catch {
      pushToast({ title: 'Lỗi lưu thứ tự ảnh', tone: 'error' });
    }
  };
  const handleImageDelete = (idx: number) => {
    const cur: string[] = script.image_urls || [];
    persistImages(cur.filter((_, i) => i !== idx));
  };
  const dragIndexRef = useRef<number | null>(null);
  const handleImageDrop = (toIdx: number) => {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from === null || from === toIdx) return;
    const cur: string[] = [...(script.image_urls || [])];
    const [moved] = cur.splice(from, 1);
    cur.splice(toIdx, 0, moved);
    persistImages(cur);
  };

  const meta = script.metadata || {};
  const wordCount = script.word_count || meta.word_count || body.split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(wordCount / 200));
  const images: string[] = script.image_urls || meta.images || [];

  return (
    <div className="border-t bg-gray-50/60 space-y-4 p-4" onClick={e => e.stopPropagation()}>

      {/* ─── Metadata Editor (editable, real-time sync) ─── */}
      <MetadataEditor script={script} onUpdate={async (patch) => {
        try { await opsApi.updateScript(script.id, patch); inv(); } catch (e: any) {
          pushToast({ title: `Lỗi lưu: ${e?.message || e}`, tone: 'error' });
        }
      }} wordCount={wordCount} readTime={readTime} />

      {/* Toggle + Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-0.5 bg-white border rounded-lg p-0.5">
          <button
            onClick={() => handleSetMode('preview')}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              mode === 'preview' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Xem Trước
          </button>
          <button
            onClick={() => handleSetMode('edit')}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              mode === 'edit' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Chỉnh Sửa
          </button>
        </div>
        <div className="flex gap-1.5 items-center">
          {mode === 'edit' && (
            <div className="flex items-center bg-white border rounded-md mr-1 p-0.5">
              <button 
                className="p-1 hover:bg-muted rounded text-zinc-600 disabled:opacity-30" 
                disabled={hIndex <= 0} 
                onClick={handleUndo} title="Hoàn tác"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button 
                className="p-1 hover:bg-muted rounded text-zinc-600 disabled:opacity-30" 
                disabled={hIndex >= history.length - 1} 
                onClick={handleRedo} title="Làm lại"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="h-3 w-3 mr-1" />Sao chép
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            const t = stripAiTitlePrefix(title || 'Kịch Bản');
            // Ưu tiên customTag làm tên file nếu đã đặt, fallback về title
            const fileBaseName = customTag?.trim() || t;
            const contentToExport = stripAiPreamble(body);
            const htmlContent = contentToExport.startsWith('```html') 
              ? contentToExport.replace(/^```html\s*/i, '').replace(/```\s*$/i, '') 
              : contentToExport;
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileBaseName.slice(0, 80).replace(/[^a-zA-Z0-9\s\-_]/g, '').trim() || 'Kich_Ban'}.html`;
            document.body.appendChild(a); 
            a.click(); 
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            pushToast({ title: 'Đã xuất HTML', tone: 'success' });
          }}>
            <FileCode className="h-3 w-3 mr-1" />Xuất
          </Button>
          {/* Auto-save indicator — thay thế nút Lưu manual */}
          <span className={`text-[10px] flex items-center gap-1 transition-all ${
            saveState === 'saving' ? 'text-amber-500' :
            saveState === 'unsaved' ? 'text-muted-foreground' : 'text-emerald-500'
          }`}>
            {saveState === 'saving' && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
            {saveState === 'saving' ? 'Đang lưu...' : saveState === 'unsaved' ? '● Chưa lưu' : '✓ Đã lưu'}
          </span>
          <Button
            size="sm"
            variant="outline"
            asChild
          >
            <a 
              href={`/GEM/cc/scripts/${script.id}`}
              onClick={(e) => {
                if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  e.preventDefault();
                  navigate(`/GEM/cc/scripts/${script.id}`);
                }
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />Mở đầy đủ
            </a>
          </Button>
        </div>
      </div>

      {/* Body content — 2026-05-07: giữ cả 2 panel trong DOM, toggle bằng display:none.
          Trước: conditional render → unmount+remount mỗi lần toggle → MarkdownBody parse lại từ đầu → freeze.
          Sau: cả 2 luôn mounted, chỉ ẩn/hiện bằng CSS → không có remount → instant toggle. */}

      {/* Preview panel — luôn mounted, ẩn bằng CSS khi mode=edit */}
      <div style={{ display: mode === 'preview' ? undefined : 'none' }}>
        {isHtmlContent(deferredBody) ? (
          <MemoizedIframePreview srcDoc={stripImagePrompt(stripCodeFence(deferredBody))} />
        ) : (
          <MemoizedMarkdownPreview body={deferredBody} visible={mode === 'preview'} />
        )}
      </div>

      {/* Edit panel — luôn mounted, ẩn bằng CSS khi mode=preview */}
      <div className="space-y-2" style={{ display: mode === 'edit' ? undefined : 'none' }}>
        {/* Title editable */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Tiêu đề
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleSave}
            className="w-full px-3 py-2 text-sm font-medium border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Nhập tiêu đề..."
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Nội dung
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onBlur={handleSave}
            className="w-full min-h-[300px] p-4 font-mono text-sm border rounded-lg resize-y bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Nhập nội dung..."
          />
        </div>
      </div>

      {/* Hình ảnh đính kèm — drag-drop nhiều ảnh, thumbnail hiện ngay */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hình ảnh đính kèm</p>
        {images.length > 1 && (
          <p className="text-[10px] text-muted-foreground">Kéo thả nhiều ảnh cùng lúc vào ô bên dưới. Kéo thumbnail để đổi thứ tự — đăng theo số 1→{images.length}.</p>
        )}
        <div
          onDragOver={(e) => { e.preventDefault(); if (!isDragOver) setIsDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
          }}
          className={`flex gap-2 flex-wrap items-center rounded-lg p-2 transition border-2 border-dashed ${isDragOver ? 'border-primary bg-primary/5' : 'border-transparent'}`}
        >
          {images.map((img, i) => (
            <div
              key={`${img}-${i}`}
              draggable
              onDragStart={() => { dragIndexRef.current = i; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.stopPropagation(); handleImageDrop(i); }}
              className="relative w-20 h-20 rounded-lg border border-zinc-100 group"
              title="Kéo để đổi thứ tự"
            >
              <img
                src={img}
                alt=""
                className="w-full h-full object-cover rounded-lg cursor-move"
                onClick={() => window.open(img, '_blank')}
              />
              <span className="absolute top-0.5 left-0.5 bg-black/70 text-white text-[9px] font-bold rounded px-1 leading-tight">{i + 1}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleImageDelete(i); }}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                title="Xóa ảnh"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          {/* Optimistic previews — đang upload (mờ + spinner) */}
          {uploadingPreviews.map((p) => (
            <div key={p.id} className="relative w-20 h-20 rounded-lg border border-zinc-100 overflow-hidden">
              <img src={p.url} alt="" className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            </div>
          ))}
          <label className="w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 cursor-pointer text-center">
            <Plus className="w-4 h-4 mb-1" />
            <span className="text-[9px] leading-tight px-1">Kéo thả / click chọn nhiều ảnh</span>
            <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      {/* Comment đầu — Playwright post ngay sau khi đăng bài (FB) */}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Comment đầu (tự động đăng sau bài viết)</p>
        <textarea
          defaultValue={meta.first_comment || ''}
          onBlur={(e) => { if ((e.target.value || '') !== (meta.first_comment || '')) saveFirstComment(e.target.value); }}
          placeholder="Vd: Link sản phẩm / hashtag / CTA... — sẽ được đăng làm comment đầu tiên ngay sau khi bài lên (FB)."
          rows={2}
          className="w-full text-[12px] px-2 py-1.5 border rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// useSessionState — persist vào sessionStorage, restore khi back
// ---------------------------------------------------------------------------
function useSessionState<T>(key: string, defaultVal: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setStateRaw] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : defaultVal;
    } catch {
      return defaultVal;
    }
  });

  const setState = useCallback((v: T | ((prev: T) => T)) => {
    setStateRaw((prev) => {
      const next = typeof v === 'function' ? (v as (prev: T) => T)(prev) : v;
      try { sessionStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  return [state, setState];
}

// ---------------------------------------------------------------------------
// useLocalState — persist vào localStorage, giữ qua đóng/mở browser
// ---------------------------------------------------------------------------
function useLocalState<T>(key: string, defaultVal: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setStateRaw] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : defaultVal;
    } catch {
      return defaultVal;
    }
  });

  const setState = useCallback((v: T | ((prev: T) => T)) => {
    setStateRaw((prev) => {
      const next = typeof v === 'function' ? (v as (prev: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  return [state, setState];
}

// ---------------------------------------------------------------------------
// MemoizedPreview — tránh re-render iframe/markdown khi parent toggle
// ---------------------------------------------------------------------------
// Detect xem body có phải HTML document/email không
function isHtmlBody(body: string): boolean {
  if (!body) return false;
  const t = body.trimStart().toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.startsWith('<table') || t.startsWith('<meta');
}

const MemoizedMarkdownPreview = memo(function MemoizedMarkdownPreview({ body, visible }: { body: string; visible: boolean }) {
  const [hasBeenVisible, setHasBeenVisible] = useState(visible);
  const [renderedHtml, setRenderedHtml] = useState('');

  useEffect(() => { if (visible) setHasBeenVisible(true); }, [visible]);

  // Nếu là HTML email: dùng iframe (không cần renderMarkdown)
  // Nếu là markdown/text: dùng renderMarkdown như cũ
  const isHtml = isHtmlBody(body);

  useEffect(() => {
    if (!hasBeenVisible || !body || isHtml) return;
    const cb = (typeof requestIdleCallback !== 'undefined' ? requestIdleCallback : setTimeout) as (
      fn: () => void, opts?: any
    ) => number;
    const id = cb(() => setRenderedHtml(renderMarkdown(body)), { timeout: 500 });
    return () => {
      (typeof cancelIdleCallback !== 'undefined' ? cancelIdleCallback : clearTimeout)(id);
    };
  }, [body, hasBeenVisible, isHtml]);

  if (!hasBeenVisible) return <div className="bg-white p-4 rounded-lg border min-h-[200px]" />;

  // HTML email: render trong iframe sandbox — không block main thread, không leak CSS
  if (isHtml) {
    return (
      <div className="rounded-lg border overflow-hidden bg-white" style={{ minHeight: 300 }}>
        <iframe
          srcDoc={buildPreviewDoc(body)}
          style={{ width: '100%', minHeight: 450, border: 'none', display: 'block' }}
          title="HTML Email Preview"
          sandbox="allow-same-origin allow-scripts allow-popups"
        />
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border text-sm min-h-[200px] max-h-[500px] overflow-y-auto leading-relaxed prose prose-sm max-w-none">
      {renderedHtml
        ? <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        : <div className="text-muted-foreground text-xs animate-pulse">Đang tải...</div>
      }
    </div>
  );
});



// ---------------------------------------------------------------------------
// ScriptRow — memo component: chỉ re-render khi isExpanded thay đổi, không
// re-render toàn bộ list mỗi khi một row được expand → fix freeze.
// ---------------------------------------------------------------------------
const ScriptRow = memo(function ScriptRow({
  s, isExpanded, isSeen, customTag, visibleBadges, isSelected, isFocused,
  onToggle, onMarkSeen, onSaveCustomTag, onSelect, onContextMenu,
  approveMut, dispatchMut, onReject, deleteMut, complianceMut,
  pushToast, navigate, inv,
}: {
  s: any; isExpanded: boolean; isSeen: boolean; customTag: string; visibleBadges: string[]; isSelected?: boolean; isFocused?: boolean;
  onToggle: (id: string) => void;
  onMarkSeen: (id: string) => void;
  onSaveCustomTag: (id: string, tag: string) => void;
  onSelect?: (id: string, checked: boolean) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
  approveMut: any; dispatchMut: any; onReject: (id: string) => void; deleteMut: any; complianceMut: any;
  pushToast: any; navigate: any; inv: () => void;
}) {
  // Lazy mount: chỉ mount ScriptExpandedPanel lần đầu khi expand, giữ trong DOM bằng CSS display:none.
  // Tác dụng: click expand lần 2+ = instant, không có mount overhead.
  const [hasBeenExpanded, setHasBeenExpanded] = useState(isExpanded);
  useEffect(() => { if (isExpanded) setHasBeenExpanded(true); }, [isExpanded]);

  const fullText = s.body || s.caption || s.content || '';

  return (
    <div 
      className={`transition-colors border-l-2 ${isFocused ? 'border-l-primary bg-primary/5' : 'border-l-transparent hover:bg-muted/20'} ${isSelected ? 'bg-primary/10' : ''}`}
      onContextMenu={(e) => onContextMenu?.(e, s.id)}
    >
      {/* Row header */}
      <div
        className={`p-4 cursor-pointer flex items-start gap-3 ${
          isSeen && !isSelected ? 'opacity-70' : ''
        }`}
        onClick={() => {
          onToggle(s.id);
          onMarkSeen(s.id);
        }}
      >
        <div className="pt-1" onClick={e => e.stopPropagation()}>
          <input 
            type="checkbox" 
            checked={!!isSelected}
            onChange={e => onSelect?.(s.id, e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {isSeen && (
              <Eye className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0" aria-label="Đã xem" />
            )}
            {visibleBadges.includes('status') && (
              <EditableBadge
                value={statusLabels[s.status] || s.status}
                options={STATUS_OPTIONS}
                onSave={async (v) => {
                  const key = Object.entries(statusLabels).find(([, lbl]) => lbl === v)?.[0] || v;
                  try { await opsApi.updateScript(s.id, { status: key }); inv(); } catch {}
                }}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[s.status] || 'bg-muted'}`}
              />
            )}
            {visibleBadges.includes('brand_voice') && s.brand_voice && (
              <EditableBadge
                value={s.brand_voice}
                options={BRAND_OPTIONS}
                onSave={async (v) => { try { await opsApi.updateScript(s.id, { brand_voice: v }); inv(); } catch {} }}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${brandColors[s.brand_voice] || 'bg-muted'}`}
              />
            )}
            {visibleBadges.includes('pillar') && s.pillar && (
              <EditableBadge
                value={s.pillar}
                options={PILLAR_OPTIONS}
                onSave={async (v) => { try { await opsApi.updateScript(s.id, { pillar: v }); inv(); } catch {} }}
                className="text-[10px] text-muted-foreground"
              />
            )}
            {visibleBadges.includes('content_type') && s.content_type && (() => {
              const isDoc = CONTENT_TYPE_OPTIONS.find(c => c.value === s.content_type)?.isDoc
                ?? /^(DOC-|onb-|welcome-|winback-|vip-)/.test(s.content_type);
              return (
                <EditableBadge
                  value={s.content_type}
                  options={CONTENT_TYPE_OPTIONS.map(c => c.value)}
                  onSave={async (v) => {
                    try {
                      await opsApi.updateScript(s.id, { content_type: v });
                      inv();
                      onSaveCustomTag(s.id, v);
                    } catch (e: any) {
                      pushToast({ type: 'error', message: `Lỗi lưu content_type: ${e?.message || String(e)}` });
                    }
                  }}
                  className={isDoc
                    ? 'rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold bg-zinc-900 text-white'
                    : 'text-[10px] text-muted-foreground'
                  }
                />
              );
            })()}
            {visibleBadges.includes('custom_tag') && (
              <EditableBadge
                value={customTag}
                isText
                placeholder="+ nhãn..."
                onSave={(v) => onSaveCustomTag(s.id, v)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-mono ${
                  customTag
                    ? 'bg-indigo-900 text-white font-semibold'
                    : 'bg-transparent border border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:border-primary/50'
                }`}
              />
            )}
            {s.posted_account && <span className="text-[10px] text-blue-500">· {s.posted_account}</span>}
            {s.posted_time_slot && <span className="text-[10px] text-muted-foreground">· {s.posted_time_slot}</span>}
          </div>
          <a
            href={`/GEM/cc/scripts/${s.id}`}
            className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 hover:underline block"
            onClick={(e) => {
              e.stopPropagation();
              if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                navigate(`/GEM/cc/scripts/${s.id}`);
              }
            }}
          >
            {s.title || '(Không có tiêu đề)'}
          </a>
          {!isExpanded && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{fullText.substring(0, 120)}</p>
          )}
          {!isExpanded && s.image_urls && Array.isArray(s.image_urls) && s.image_urls.length > 0 && (
            <div className="flex gap-1 mt-1">
              {s.image_urls.slice(0, 2).map((u: string, i: number) => (
                <img key={i} src={u} alt="" className="h-8 w-8 rounded object-cover" />
              ))}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(s.created_at)}</div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {s.status === 'draft' && (
            <>
              <Button size="sm" variant="outline" disabled={approveMut.isPending} onClick={() => approveMut.mutate(s.id)}>
                <Check className="h-3 w-3 mr-1" />Đuyệt
              </Button>
              <Button size="sm" variant="outline" onClick={() => onReject(s.id)}>
                <X className="h-3 w-3 mr-1" />Từ chối
              </Button>
            </>
          )}
          {(s.status === 'draft' || s.status === 'approved') && (
            <Button
              size="sm"
              disabled={dispatchMut.isPending}
              onClick={() => dispatchMut.mutate(s.id)}
              title={s.posted_account === 'resend' ? 'Gửi newsletter (Resend)' : (s.publish_mode === 'scheduled' || s.publish_mode === 'schedule2week') ? `Lên lịch Meta BS theo scheduled_at (${s.posted_account || '?'})` : `Đăng ngay (${s.posted_account || '?'})`}
            >
              <Send className="h-3 w-3 mr-1" />
              {(s.publish_mode === 'scheduled' || s.publish_mode === 'schedule2week') ? 'Lên lịch' : s.publish_mode === 'threshold_5' ? 'Đăng batch' : 'Đăng ngay'}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(fullText).then(() => pushToast({ title: 'Đã copy', tone: 'success' })).catch(() => {});
          }} title="Sao chép">
            <Copy className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => {
            e.stopPropagation();
            const t = stripAiTitlePrefix(s.title || 'Kịch Bản');
            // Ưu tiên customTag làm tên file
            const fileBaseName = customTag?.trim() || t;
            const contentToExport = stripAiPreamble(fullText);
            const htmlContent = contentToExport.startsWith('```html') ? contentToExport.replace(/^```html\s*/i, '').replace(/```\s*$/i, '') : contentToExport;
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileBaseName.slice(0, 80).replace(/[^a-zA-Z0-9\s\-_]/g, '').trim() || 'Kich_Ban'}.html`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            pushToast({ title: 'Đã xuất HTML', tone: 'success' });
          }} title="Xuất HTML">
            <FileCode className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => complianceMut.mutate(fullText)} title="Compliance check">
            <Shield className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Xóa bài này?')) deleteMut.mutate(s.id); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/GEM/ops/content-pipeline?tab=aigen&scriptId=${s.id}`);
            }}
            title="Mở full ở tab Trình Tạo Nội Dung AI"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          {isExpanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </div>
      </div>

      {/* Expanded panel — lazy mount + CSS display:none: instant toggle lần 2+ */}
      <div style={{ display: isExpanded ? undefined : 'none' }}>
        {hasBeenExpanded && <ScriptExpandedPanel script={s} customTag={customTag} />}
      </div>
    </div>
  );
});

// Font links chỉ — inject vào <head> (nhẹ, không có style block lớn)
const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">`;

// Script inject vào iframe — tooltip follow cursor khi hover link
const IFRAME_HOVER_SCRIPT = `<script>
(function(){
  var tip = document.createElement('div');
  Object.assign(tip.style, {
    position:'fixed', top:'0', left:'0',
    background:'rgba(15,15,15,0.92)', color:'#e2e8f0',
    fontSize:'11px', lineHeight:'1.4', padding:'5px 10px', borderRadius:'6px',
    display:'none', zIndex:'99999', maxWidth:'420px', wordBreak:'break-all',
    pointerEvents:'none', fontFamily:'ui-monospace,monospace',
    boxShadow:'0 2px 8px rgba(0,0,0,0.4)',
    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'
  });
  document.body && document.body.appendChild(tip);
  function attachTip(){ if(document.body && !document.body.contains(tip)) document.body.appendChild(tip); }
  attachTip();
  document.addEventListener('DOMContentLoaded', attachTip);

  var mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', function(e){
    mouseX = e.clientX; mouseY = e.clientY;
    if(tip.style.display === 'block') moveTip();
  });
  function moveTip(){
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var tipW = tip.offsetWidth || 300;
    var x = mouseX + 14;
    if(x + tipW > vw - 8) x = mouseX - tipW - 8;
    if(x < 4) x = 4;
    tip.style.left = x + 'px';
    // hiển thị phía trên cursor
    tip.style.top = (mouseY - tip.offsetHeight - 10) + 'px';
  }
  document.addEventListener('mouseover', function(e){
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    var href = a ? a.getAttribute('href') : null;
    if(href && !href.startsWith('javascript') && !href.startsWith('#')){
      tip.textContent = '\uD83D\uDD17 ' + href;
      tip.style.display = 'block';
      moveTip();
    } else {
      tip.style.display = 'none';
    }
  });
  document.addEventListener('mouseout', function(){ tip.style.display = 'none'; });
})();
<\/script>`;

// JS thuần cho hover tooltip — inject qua DOM sau khi iframe load
// (không bạk vào HTML string → giảm overhead buildPreviewDoc)
const HOVER_JS = `(function(){
  var tip=document.createElement('div');
  Object.assign(tip.style,{position:'fixed',top:'0',left:'0',background:'rgba(15,15,15,0.92)',color:'#e2e8f0',fontSize:'11px',lineHeight:'1.4',padding:'5px 10px',borderRadius:'6px',display:'none',zIndex:'99999',maxWidth:'420px',wordBreak:'break-all',pointerEvents:'none',fontFamily:'ui-monospace,monospace',boxShadow:'0 2px 8px rgba(0,0,0,0.4)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'});
  document.body.appendChild(tip);
  var mx=0,my=0;
  document.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;if(tip.style.display==='block')mv();});
  function mv(){var vw=document.documentElement.clientWidth||window.innerWidth;var tw=tip.offsetWidth||300;var x=mx+14;if(x+tw>vw-8)x=mx-tw-8;if(x<4)x=4;tip.style.left=x+'px';tip.style.top=(my-tip.offsetHeight-10)+'px';}
  document.addEventListener('mouseover',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href]');var href=a?a.getAttribute('href'):null;if(href&&!href.startsWith('javascript')&&!href.startsWith('#')){tip.textContent='\uD83D\uDD17 '+href;tip.style.display='block';mv();}else{tip.style.display='none';}});
  document.addEventListener('mouseout',function(){tip.style.display='none';});
})();`;

function buildPreviewDoc(srcDoc: string): string {
  const trimmed = srcDoc.trim();
  const isFullDoc = /^<!DOCTYPE/i.test(trimmed) || /^<html/i.test(trimmed);
  if (isFullDoc) {
    let doc = trimmed.replace(/(<head[^>]*>)/i, `$1\n${FONT_LINK}`);
    if (doc === trimmed) {
      doc = trimmed.replace(/(<body[^>]*>)/i, `<head>${FONT_LINK}</head>\n$1`);
    }
    return doc;
  }
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank">${FONT_LINK}</head><body>${trimmed}</body></html>`;
}


const MemoizedIframePreview = memo(function MemoizedIframePreview({ srcDoc }: { srcDoc: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeDoc, setActiveDoc] = useState('');

  useEffect(() => {
    setActiveDoc('');
    setLoaded(false);
    const raf = requestAnimationFrame(() => {
      // buildPreviewDoc nhẹ hơn: chỉ inject font link, không bạk hover script
      setActiveDoc(buildPreviewDoc(srcDoc));
    });
    return () => cancelAnimationFrame(raf);
  }, [srcDoc]);

  return (
    <div className="rounded-lg border overflow-hidden bg-white relative" style={{ minHeight: 600 }}>
      {(!activeDoc || !loaded) && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-gray-50 z-10">
          <span className="animate-pulse">Loading preview...</span>
        </div>
      )}
      {activeDoc && (
        <iframe
          ref={iframeRef}
          srcDoc={activeDoc}
          style={{ width:'100%', minHeight:600, border:'none', display:'block', opacity: loaded ? 1 : 0, transition:'opacity 0.15s ease' }}
          title="HTML Preview"
          sandbox="allow-same-origin allow-scripts allow-popups"
          onLoad={(e) => {
            const iframe = e.currentTarget;
            try {
              const doc = iframe.contentDocument;
              if (doc?.body) {
                // Inject font normalizer style
                const st = doc.createElement('style');
                st.textContent = `body,*{-webkit-font-smoothing:antialiased;}:not([style*='font-family']){font-family:'Be Vietnam Pro',Arial,sans-serif;}`;
                doc.head?.appendChild(st);
                // Inject hover tooltip script (nhẹ, không phải bắt HTML string)
                const sc = doc.createElement('script');
                sc.textContent = HOVER_JS;
                doc.body.appendChild(sc);
                // Adjust height TRƯỚC khi show
                const h = doc.documentElement.scrollHeight;
                if (h > 0) iframe.style.height = Math.min(h + 20, 2000) + 'px';
              }
            } catch {}
            setLoaded(true);
          }}
        />
      )}
    </div>
  );
});


// ---------------------------------------------------------------------------
// ContentTab
// ---------------------------------------------------------------------------

/**
 * @archetype list
 * @size small
 * @navigable
 */
export function ContentTab() {
  const EmptyState = () => null;


  const qc = useQueryClient();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useSessionState<string>('contentTab.statusFilter', '');
  const [pillarFilter, setPillarFilter] = useSessionState<string>('contentTab.pillarFilter', '');
  const [limit, setLimit] = useSessionState<number>('contentTab.limit', 20);
  const [expandedId, setExpandedId] = useSessionState<string | null>('contentTab.expandedId', null);

  // Advanced features state
  const [visibleBadges, setVisibleBadges] = useLocalState<string[]>('contentTab.visibleBadges', [
    'status', 'brand_voice', 'pillar', 'content_type', 'custom_tag'
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  // Advanced Grid States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, scriptId: string } | null>(null);
  const [groupBy, setGroupBy] = useSessionState<string>('contentTab.groupBy', 'none');
  // View switcher: list (default) | board (kanban) | calendar. Persisted per session.
  const [viewMode, setViewMode] = useSessionState<'list' | 'board' | 'calendar'>('contentTab.viewMode', 'list');

  // "Đã xem" tracking — localStorage: giữ qua đóng browser, reset bằng tay nếu cần
  const [seenIds, setSeenIds] = useLocalState<string[]>('contentTab.seenIds', []);
  const seenSet = useMemo(() => new Set(seenIds), [seenIds]);

  const markSeen = useCallback((id: string) => {
    setSeenIds((prev) => prev.includes(id) ? prev : [...prev, id]);
  }, [setSeenIds]);

  // Custom label tags per script — localStorage, giữ qua đóng browser
  const [customTags, setCustomTags] = useLocalState<Record<string, string>>('contentTab.customTags', {});
  const saveCustomTag = useCallback((id: string, tag: string) => {
    setCustomTags((prev) => ({ ...prev, [id]: tag }));
  }, [setCustomTags]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => prev === id ? null : id);
  }, [setExpandedId]);

  const handleReject = useCallback((id: string) => setRejectId(id), []);

  // Scroll restore — lưu scrollY của page khi navigate đi, restore khi mount lại
  const scrollKeyRef = useRef('contentTab.scrollY');
  useEffect(() => {
    // Restore scroll sau khi list đã render
    const saved = sessionStorage.getItem(scrollKeyRef.current);
    if (saved) {
      const y = parseInt(saved, 10);
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }));
    }
    // Lưu scrollY trước khi unmount
    return () => {
      sessionStorage.setItem(scrollKeyRef.current, String(Math.round(window.scrollY)));
    };
  }, []); // chỉ chạy khi mount/unmount
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);

  const { data: scripts, isLoading } = useQuery({
    queryKey: ['ops', 'scripts', statusFilter, pillarFilter, limit],
    queryFn: () => opsApi.getScripts({
      ...(statusFilter && { status: statusFilter }),
      ...(pillarFilter && { pillar: pillarFilter }),
      limit: limit.toString(),
    }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // Memoize inv — pass as stable prop to memoized ScriptRow (prevents memo bust on parent re-render)
  const inv = useCallback(() => qc.invalidateQueries({ queryKey: ['ops'] }), [qc]);

  const approveMut = useMutation({
    mutationFn: (id: string) => opsApi.approveScript(id),
    onSuccess: () => { inv(); pushToast({ title: 'Đã duyệt', tone: 'success' }); },
  });
  const dispatchMut = useMutation({
    mutationFn: (id: string) => opsApi.dispatchScript(id),
    onSuccess: (r: any) => { inv(); pushToast({ title: r?.mode === 'scheduled' ? 'Đang lên lịch Meta BS' : 'Đang đăng ngay', tone: 'success' }); },
    onError: (e: any) => pushToast({ title: e?.message || 'Lỗi đăng/lên lịch', tone: 'error' }),
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => opsApi.rejectScript(id, reason),
    onSettled: () => { inv(); setRejectId(null); setRejectReason(''); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => opsApi.deleteScript(id),
    onSuccess: () => { inv(); pushToast({ title: 'Đã xóa', tone: 'info' }); },
  });

  const complianceMut = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch('/api/ops/content-pipeline/compliance-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      return res.json();
    },
    onSuccess: (data) => pushToast({
      title: data?.pass ? '✅ Compliance OK' : `❌ Vi phạm: ${(data?.violations || []).join(', ')}`,
      tone: data?.pass ? 'success' : 'error',
    }),
  });

  // Sort state (multi-sort)
  const [sorts, setSorts] = useSessionState<{ field: string; dir: 'asc'|'desc' }[]>('contentTab.sorts', [{ field: 'created_at', dir: 'desc' }]);
  // Extra filters
  const [categoryFilter, setCategoryFilter] = useSessionState<string>('contentTab.categoryFilter', '');
  const [accountFilter, setAccountFilter] = useSessionState<string>('contentTab.accountFilter', '');
  const [dateFrom, setDateFrom] = useSessionState<string>('contentTab.dateFrom', '');
  const [dateTo, setDateTo] = useSessionState<string>('contentTab.dateTo', '');
  // Saved filters/views
  const [savedFilters, setSavedFilters] = useLocalState<{ name: string; state: any }[]>('contentTab.savedFilters', []);
  // Recent searches
  const [recentSearches, setRecentSearches] = useLocalState<string[]>('contentTab.recentSearches', []);
  const [showSearchSug, setShowSearchSug] = useState(false);
  // Version history modal
  const [versionHistoryScript, setVersionHistoryScript] = useState<any>(null);
  // Audit log
  const [auditLog, setAuditLog] = useLocalState<{ ts: string; action: string; id: string; detail: string }[]>('contentTab.auditLog', []);
  const addAudit = useCallback((action: string, id: string, detail: string) => {
    setAuditLog(prev => [{ ts: new Date().toISOString(), action, id, detail }, ...prev].slice(0, 200));
  }, [setAuditLog]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  // Advanced filter builder
  const [showAdvFilter, setShowAdvFilter] = useState(false);
  const [advFilters, setAdvFilters] = useLocalState<{ field: string; op: string; value: string; logic: 'AND'|'OR' }[]>('contentTab.advFilters', []);

  const list = useMemo(() => {
    let res: any[] = scripts || [];
    // Basic search (title + body full-text)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      res = res.filter((s: any) =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.body || '').toLowerCase().includes(q) ||
        (s.content || '').toLowerCase().includes(q)
      );
    }
    // Category (blog_category)
    if (categoryFilter) res = res.filter((s: any) => s.blog_category === categoryFilter);
    // Account
    if (accountFilter) res = res.filter((s: any) => s.posted_account === accountFilter);
    // Date range
    if (dateFrom) res = res.filter((s: any) => s.created_at && s.created_at >= dateFrom);
    if (dateTo) res = res.filter((s: any) => s.created_at && s.created_at <= dateTo + 'T23:59:59');
    // Advanced AND/OR filters
    if (advFilters.length > 0) {
      res = res.filter((s: any) => {
        let result = true;
        for (let i = 0; i < advFilters.length; i++) {
          const f = advFilters[i];
          const val = String(s[f.field] || '').toLowerCase();
          const fval = f.value.toLowerCase();
          let match = false;
          if (f.op === 'eq') match = val === fval;
          else if (f.op === 'contains') match = val.includes(fval);
          else if (f.op === 'gt') match = val > fval;
          else if (f.op === 'lt') match = val < fval;
          if (i === 0) result = match;
          else if (f.logic === 'AND') result = result && match;
          else result = result || match;
        }
        return result;
      });
    }
    // Multi-sort
    if (sorts.length > 0) {
      res = [...res].sort((a, b) => {
        for (const s of sorts) {
          const av = a[s.field] ?? '';
          const bv = b[s.field] ?? '';
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp;
        }
        return 0;
      });
    }
    return res;
  }, [scripts, searchQuery, categoryFilter, accountFilter, dateFrom, dateTo, advFilters, sorts]);

  // Save search to recent
  const commitSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (q.trim()) setRecentSearches(prev => [q, ...prev.filter(x => x !== q)].slice(0, 8));
  }, [setRecentSearches]);

  // Save current filter state as named view
  const saveCurrentView = useCallback((name: string) => {
    setSavedFilters(prev => [
      { name, state: { statusFilter, pillarFilter, categoryFilter, accountFilter, dateFrom, dateTo, searchQuery, sorts, advFilters } },
      ...prev.filter(f => f.name !== name),
    ]);
  }, [statusFilter, pillarFilter, categoryFilter, accountFilter, dateFrom, dateTo, searchQuery, sorts, advFilters, setSavedFilters]);

  const loadView = useCallback((view: any) => {
    if (!view?.state) return;
    const st = view.state;
    if (st.statusFilter !== undefined) setStatusFilter(st.statusFilter);
    if (st.pillarFilter !== undefined) setPillarFilter(st.pillarFilter);
    if (st.categoryFilter !== undefined) setCategoryFilter(st.categoryFilter);
    if (st.accountFilter !== undefined) setAccountFilter(st.accountFilter);
    if (st.dateFrom !== undefined) setDateFrom(st.dateFrom);
    if (st.dateTo !== undefined) setDateTo(st.dateTo);
    if (st.searchQuery !== undefined) setSearchQuery(st.searchQuery);
    if (st.sorts !== undefined) setSorts(st.sorts);
    if (st.advFilters !== undefined) setAdvFilters(st.advFilters);
  }, [setStatusFilter, setPillarFilter, setCategoryFilter, setAccountFilter, setDateFrom, setDateTo, setSorts, setAdvFilters]);
  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!list) return;
    if (e.target.checked) setSelectedIds(new Set(list.map((s:any) => s.id)));
    else setSelectedIds(new Set());
  }, [list]);

  const groupedList = useMemo(() => {
    if (!groupBy || groupBy === 'none') return { ungrouped: list };
    const groups: Record<string, any[]> = {};
    list.forEach((s: any) => {
      let key = s[groupBy] || 'Chưa phân loại';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [list, groupBy]);

  // Virtualization reverted 2026-05-13: useWindowVirtualizer had scrollMargin
  // computation issues (ref null on first render → wrong offsets → blank-page
  // bug). Default limit=20 + memoized `inv` + lazy-mount ScriptExpandedPanel
  // + CSS display:none toggle is enough for typical usage. If user needs to
  // load 1000 rows, perf will degrade — consider re-implementing virtualizer
  // with proper getBoundingClientRect-based scrollMargin or container-based
  // useVirtualizer with fixed-height parent.

  // Keyboard navigation & Context Menu logic
  useEffect(() => {
    if (!list || list.length === 0) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, list.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        const scriptId = list[focusedIndex].id;
        handleToggle(scriptId);
        markSeen(scriptId);
      } else if (e.key === 'x' && focusedIndex >= 0) {
        e.preventDefault();
        const scriptId = list[focusedIndex].id;
        handleSelect(scriptId, !selectedIds.has(scriptId));
      } else if (e.key === 'a' && e.ctrlKey) {
        e.preventDefault();
        if (selectedIds.size === list.length) {
          setSelectedIds(new Set());
        } else {
          setSelectedIds(new Set(list.map((s: any) => s.id)));
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [list, focusedIndex, selectedIds]);

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, scriptId: id });
  }, []);
  
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return (
    <div className="space-y-4">
      {false && <EmptyState />}
      {/* 2026-04-18 — Jobs Queue sub-tab removed. It now lives at the top of
          the "AI Tạo Nội Dung" tab so all generation controls are in one
          place. This tab is now Scripts-only. */}
      <>
      {/* ── Search bar with suggestions ─────────────────────────────── */}
      <div className="relative">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchSug(true)}
              onBlur={() => setTimeout(() => setShowSearchSug(false), 150)}
              onKeyDown={e => { if (e.key === 'Enter') commitSearch(searchQuery); if (e.key === 'Escape') { setSearchQuery(''); setShowSearchSug(false); } }}
              placeholder="Tìm tiêu đề, nội dung..."
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button size="sm" variant={showAdvFilter ? 'default' : 'outline'} onClick={() => setShowAdvFilter(v => !v)} title="Bộ lọc nâng cao AND/OR">
            <Filter className="h-4 w-4 mr-1" />{advFilters.length > 0 ? `Filter (${advFilters.length})` : 'Filter'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAuditLog(v => !v)} title="Lịch sử thao tác">
            <History className="h-4 w-4" />
          </Button>
        </div>
        {/* Search suggestions dropdown */}
        {showSearchSug && (recentSearches.length > 0 || searchQuery.trim()) && (
          <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border rounded-md shadow-lg py-1 text-sm">
            {recentSearches.length > 0 && (
              <>
                <div className="px-3 py-1 text-xs text-muted-foreground font-medium">Tìm gần đây</div>
                {recentSearches.map((q, i) => (
                  <button key={i} className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2" onMouseDown={() => { commitSearch(q); setShowSearchSug(false); }}>
                    <Clock className="h-3 w-3 text-muted-foreground" />{q}
                  </button>
                ))}
                <div className="h-px bg-border my-1" />
                <button className="w-full text-left px-3 py-1 text-xs text-muted-foreground hover:bg-muted" onMouseDown={() => setRecentSearches([])}>Xóa lịch sử</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Filter row ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filters dùng đúng giá trị DB thật (cc_scripts): status / pillar / blog_category / posted_account */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabels[s] || s}</option>)}
        </select>
        <select value={pillarFilter} onChange={e => setPillarFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
          <option value="">Tất cả pillar</option>
          {PILLAR_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
          <option value="">Tất cả danh mục</option>
          {BLOG_CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
          <option value="">Tất cả tài khoản</option>
          {ACCOUNT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" title="Từ ngày" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" title="Đến ngày" />
        <div className="h-6 w-px bg-border self-center" />
        {/* Sort */}
        <select
          value={sorts[0]?.field || 'created_at'}
          onChange={e => setSorts([{ field: e.target.value, dir: sorts[0]?.dir || 'desc' }])}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="created_at">Ngày tạo</option>
          <option value="title">Tiêu đề</option>
          <option value="status">Trạng thái</option>
          <option value="pillar">Pillar</option>
          <option value="content_type">Loại</option>
        </select>
        <button
          onClick={() => setSorts(prev => [{ field: prev[0]?.field || 'created_at', dir: prev[0]?.dir === 'asc' ? 'desc' : 'asc' }])}
          className="px-2 py-1.5 border rounded-md text-sm bg-background hover:bg-muted"
          title={sorts[0]?.dir === 'asc' ? 'Đang tăng dần — click để đổi' : 'Đang giảm dần — click để đổi'}
        >
          {sorts[0]?.dir === 'asc' ? '↑ Tăng' : '↓ Giảm'}
        </button>
        <div className="h-6 w-px bg-border self-center" />
        {/* Group */}
        <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
          <option value="none">Không nhóm</option>
          <option value="status">Nhóm: Trạng thái</option>
          <option value="pillar">Nhóm: Pillar</option>
          <option value="content_type">Nhóm: Loại</option>
          <option value="blog_category">Nhóm: Danh mục</option>
        </select>
      </div>

      {/* ── Saved views bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-muted-foreground font-medium">Views đã lưu:</span>
        {savedFilters.length === 0 && <span className="text-muted-foreground/60 italic">Chưa có view nào</span>}
        {savedFilters.map((v, i) => (
          <button key={i} onClick={() => loadView(v)} className="px-2 py-0.5 rounded-full bg-muted border hover:bg-primary/10 hover:border-primary/30 transition-colors flex items-center gap-1">
            <Bookmark className="h-3 w-3" />{v.name}
          </button>
        ))}
        <button
          onClick={() => { const n = prompt('Tên view:'); if (n?.trim()) saveCurrentView(n.trim()); }}
          className="px-2 py-0.5 rounded-full border border-dashed hover:bg-muted transition-colors flex items-center gap-1 text-muted-foreground"
        >
          <Plus className="h-3 w-3" />Lưu view hiện tại
        </button>
        <span className="ml-auto text-muted-foreground/60">{list.length} kết quả</span>
      </div>

      {/* ── Advanced filter builder ──────────────────────────────────── */}
      {showAdvFilter && (
        <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />Bộ lọc nâng cao
            <span className="ml-auto text-xs text-muted-foreground/60">AND = thỏa cả hai · OR = thỏa một trong hai</span>
          </div>
          {advFilters.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && (
                <select value={f.logic} onChange={e => setAdvFilters(prev => prev.map((x, j) => j === i ? { ...x, logic: e.target.value as 'AND'|'OR' } : x))} className="text-xs border rounded px-1 py-0.5 w-14">
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              )}
              {i === 0 && <span className="text-xs text-muted-foreground w-14 text-center">WHERE</span>}
              <select value={f.field} onChange={e => setAdvFilters(prev => prev.map((x, j) => j === i ? { ...x, field: e.target.value } : x))} className="text-xs border rounded px-2 py-0.5">
                <option value="status">status</option>
                <option value="pillar">pillar</option>
                <option value="content_type">content_type</option>
                <option value="brand_voice">brand_voice</option>
                <option value="blog_category">blog_category</option>
                <option value="posted_account">posted_account</option>
                <option value="title">title</option>
              </select>
              <select value={f.op} onChange={e => setAdvFilters(prev => prev.map((x, j) => j === i ? { ...x, op: e.target.value } : x))} className="text-xs border rounded px-2 py-0.5">
                <option value="eq">= bằng</option>
                <option value="contains">chứa</option>
                <option value="gt">&gt; lớn hơn</option>
                <option value="lt">&lt; nhỏ hơn</option>
              </select>
              <input value={f.value} onChange={e => setAdvFilters(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="giá trị..." className="text-xs border rounded px-2 py-0.5 flex-1 min-w-0" />
              <button onClick={() => setAdvFilters(prev => prev.filter((_, j) => j !== i))} className="text-destructive hover:bg-destructive/10 rounded p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button onClick={() => setAdvFilters(prev => [...prev, { field: 'status', op: 'eq', value: '', logic: 'AND' }])} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus className="h-3 w-3" />Thêm điều kiện
          </button>
          {advFilters.length > 0 && (
            <button onClick={() => setAdvFilters([])} className="text-xs text-destructive hover:underline ml-3">Xóa tất cả filter</button>
          )}
        </div>
      )}

      {/* ── Audit log panel ─────────────────────────────────────────── */}
      {showAuditLog && (
        <div className="border rounded-lg p-3 space-y-1.5 bg-muted/20 max-h-56 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
            <History className="h-3.5 w-3.5" />Lịch sử thao tác ({auditLog.length})
            <button onClick={() => setAuditLog([])} className="ml-auto text-destructive hover:underline text-xs">Xóa log</button>
          </div>
          {auditLog.length === 0 && <p className="text-xs text-muted-foreground/60 italic">Chưa có thao tác nào được ghi.</p>}
          {auditLog.map((a, i) => (
            <div key={i} className="text-xs flex items-start gap-2 py-0.5 border-b border-border/20 last:border-0">
              <span className="text-muted-foreground/60 tabular-nums shrink-0">{new Date(a.ts).toLocaleTimeString('vi-VN')}</span>
              <span className="font-medium text-primary/80">{a.action}</span>
              <span className="text-muted-foreground flex-1">{a.detail}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Action bar (view switcher left · actions right) ──────────── */}
      <div className="flex gap-2 justify-between items-center flex-wrap">
        {/* View switcher — reuse Issues toggle style (list/board/calendar) */}
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button
            className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setViewMode('list')}
            title="Danh sách"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            className={`p-1.5 transition-colors ${viewMode === 'board' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setViewMode('board')}
            title="Bảng (Kanban)"
          >
            <Columns3 className="h-3.5 w-3.5" />
          </button>
          <button
            className={`p-1.5 transition-colors ${viewMode === 'calendar' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setViewMode('calendar')}
            title="Lịch"
          >
            <Calendar className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link to="/GEM/cc/ai-gen">✨ AI Tạo nội dung</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/GEM/cc/scripts">📄 Kịch bản CC</Link>
          </Button>
          <Button size="sm" onClick={() => { setCreateForm(defaultCreateForm); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-1" />Tạo nội dung
          </Button>
        </div>
      </div>
      {/* List / Board / Calendar — switched by viewMode */}
      {viewMode === 'board' ? (
        <ContentBoardView items={list} />
      ) : viewMode === 'calendar' ? (
        <ContentCalendarView items={list} />
      ) : (
      <Card>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Chưa có nội dung nào.</div>
        ) : (
          <div className="divide-y">
            <div className="bg-muted/30 px-4 py-2 flex items-center gap-3 border-b text-sm font-medium text-muted-foreground">
              <input 
                type="checkbox" 
                onChange={handleSelectAll} 
                checked={list.length > 0 && selectedIds.size === list.length}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>Tất cả</span>
            </div>
            {Object.entries(groupedList).map(([groupName, items]) => (
              <div key={groupName}>
                {groupBy && groupBy !== 'none' && <div className="bg-muted/50 px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase border-b">{groupName}</div>}
                {(items as any[]).map((s: any, idx: number) => {
                  const globalIdx = list.findIndex((x:any) => x.id === s.id);
                  return (
                    <ScriptRow
                      key={s.id}
                      s={s}
                      isExpanded={expandedId === s.id}
                      isSeen={seenSet.has(s.id)}
                      customTag={customTags[s.id] || ''}
                      visibleBadges={visibleBadges}
                      isSelected={selectedIds.has(s.id)}
                      isFocused={focusedIndex === globalIdx}
                      onToggle={handleToggle}
                      onMarkSeen={markSeen}
                      onSaveCustomTag={saveCustomTag}
                      onSelect={handleSelect}
                      onContextMenu={handleContextMenu}
                      approveMut={approveMut}
                      dispatchMut={dispatchMut}
                      onReject={handleReject}
                      deleteMut={deleteMut}
                      complianceMut={complianceMut}
                      pushToast={pushToast}
                      navigate={navigate}
                      inv={inv}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
        {!isLoading && list.length > 0 && (
          <div className="p-4 flex items-center justify-center gap-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setLimit(l => l + 10)}>
              Hiển thị thêm 10 bài
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLimit(1000)}>
              Tất cả
            </Button>
          </div>
        )}
      </Card>
      )}

      {/* Reject modal */}
      <SimpleModal
        open={!!rejectId}
        onClose={() => setRejectId(null)}
        title="Từ chối nội dung"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectId(null)}>Hủy</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => rejectId && rejectMut.mutate({ id: rejectId, reason: rejectReason })}
            >
              Từ chối
            </Button>
          </>
        }
      >
        <textarea
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          placeholder="Lý do từ chối..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
        />
      </SimpleModal>

      {/* Create modal */}
      <SimpleModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tạo nội dung mới"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button
              disabled={!createForm.title.trim()}
              onClick={() => {
                fetch('/api/ops/content-pipeline/scripts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(createForm),
                })
                  .then(res => { if (!res.ok) throw new Error(); return res.json(); })
                  .then(() => {
                    pushToast({ title: 'Đã tạo nội dung', tone: 'success' });
                    inv();
                    setShowCreate(false);
                    setCreateForm(defaultCreateForm);
                  })
                  .catch(() => pushToast({ title: 'Lỗi tạo nội dung', tone: 'error' }));
              }}
            >
              Tạo
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Tiêu đề *</label>
            <Input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Nội dung</label>
            <textarea
              value={createForm.body}
              onChange={e => setCreateForm(f => ({ ...f, body: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Pillar</label>
              <select value={createForm.pillar} onChange={e => setCreateForm(f => ({ ...f, pillar: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="trading">Trading</option>
                <option value="spiritual">Spiritual</option>
                <option value="lifestyle">Lifestyle</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Loại</label>
              <select value={createForm.content_type} onChange={e => setCreateForm(f => ({ ...f, content_type: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="social_post">Social post</option>
                <option value="blog">Blog</option>
                <option value="email">Email</option>
                <option value="push_notification">Push</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Brand voice</label>
              <select value={createForm.brand_voice} onChange={e => setCreateForm(f => ({ ...f, brand_voice: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="jennie">Jennie cá nhân</option>
                <option value="generic">Gemral chung</option>
              </select>
            </div>
          </div>
        </div>
      </SimpleModal>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-2xl border px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
          <span className="text-sm font-medium">{selectedIds.size} đã chọn</span>
          <div className="h-4 w-px bg-border" />
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8" 
            onClick={async () => {
              const ids = Array.from(selectedIds);
              for (const id of ids) await opsApi.approveScript(id);
              setSelectedIds(new Set());
              inv();
              pushToast({ title: `Đã duyệt ${ids.length} script`, tone: 'success' });
            }}
          >
            <Check className="w-4 h-4 mr-2" /> Duyệt hàng loạt
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
            onClick={async () => {
              if (!confirm(`Xóa vĩnh viễn ${selectedIds.size} script?`)) return;
              const ids = Array.from(selectedIds);
              for (const id of ids) await opsApi.deleteScript(id);
              setSelectedIds(new Set());
              inv();
              pushToast({ title: `Đã xóa ${ids.length} script`, tone: 'info' });
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Xóa hàng loạt
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelectedIds(new Set())}>
            Bỏ chọn
          </Button>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeContextMenu} onContextMenu={e => { e.preventDefault(); closeContextMenu(); }} />
          <div 
            className="fixed z-50 min-w-48 bg-white border rounded-md shadow-lg py-1 text-sm animate-in fade-in zoom-in-95 duration-100"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-1.5 hover:bg-muted cursor-pointer flex items-center gap-2" onClick={() => { handleToggle(contextMenu.scriptId); closeContextMenu(); }}>
              <Eye className="w-4 h-4" /> Xem chi tiết
            </div>
            <div className="px-3 py-1.5 hover:bg-muted cursor-pointer flex items-center gap-2" onClick={() => { handleSelect(contextMenu.scriptId, !selectedIds.has(contextMenu.scriptId)); closeContextMenu(); }}>
              <Check className="w-4 h-4" /> Chọn / Bỏ chọn
            </div>
            <div className="h-px bg-border my-1" />
            <div className="px-3 py-1.5 hover:bg-muted cursor-pointer text-destructive flex items-center gap-2" onClick={() => { 
              if (confirm('Xóa script này?')) deleteMut.mutate(contextMenu.scriptId); 
              closeContextMenu(); 
            }}>
              <Trash2 className="w-4 h-4" /> Xóa script
            </div>
          </div>
        </>
      )}

      </>
    </div>
  );
}
