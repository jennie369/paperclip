import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Clock,
  Eye,
  Trash2,
  Copy,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
  Film,
  X,
  ArrowUpDown,
  Newspaper,
  BarChart3,
} from 'lucide-react';
import { Card } from '@gem/ui';
import { Button } from '@gem/ui';
import { Badge } from '@gem/ui';
import { EmptyState } from '@gem/ui';
import { useToast } from '@gem/ui';
import { useScripts, useDeleteScript } from '@gem/hooks/useQueryHooks';
import CCSelect from './CCSelect';

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG = {
  draft: { label: 'Bản Nháp', variant: 'info' },
  generating: { label: 'Đang Tạo', variant: 'default' },
  review: { label: 'Chờ Duyệt', variant: 'gold' },
  revision: { label: 'Cần Sửa', variant: 'danger' },
  approved: { label: 'Đã Duyệt', variant: 'success' },
  published: { label: 'Đã Xuất Bản', variant: 'success' },
  archived: { label: 'Lưu Trữ', variant: 'default' },
};

const CONTENT_TYPE_CONFIG = {
  latc: { label: 'LATC', icon: BookOpen, color: 'text-gold' },
  tmt: { label: 'TMT', icon: Users, color: 'text-purple' },
  short_clip: { label: 'Clip Ngắn', icon: Film, color: 'text-cyan' },
  social_post: { label: 'Bài Đăng MXH', icon: FileText, color: 'text-pink' },
  news: { label: 'Tin Tức', icon: Newspaper, color: 'text-emerald' },
  analysis: { label: 'Phân Tích', icon: BarChart3, color: 'text-cyan' },
};

const TRACK_CONFIG = {
  wealth: { label: 'Wealth', color: 'text-gold' },
  wellness: { label: 'Wellness', color: 'text-purple' },
  integration: { label: 'Integration', color: 'text-emerald' },
};

const PAGE_SIZE = 20;

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTimeAgo(dateStr) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return formatDate(dateStr);
}

function estimateDuration(wordCount) {
  if (!wordCount) return '\u2014';
  const minutes = Math.round(wordCount / 150);
  if (minutes < 1) return '< 1 phút';
  return `~${minutes} phút`;
}

// ============================================================================
// Main Component
// ============================================================================

export default function ScriptsListPage() {
  const router = useRouter();
  const addToast = useToast((s) => s.addToast);
  const deleteMutation = useDeleteScript();

  // --- Filters ---
  const [search, setSearch] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // --- Build filter object ---
  const filters = useMemo(() => ({
    ...(search ? { search } : {}),
    ...(contentTypeFilter ? { content_type: contentTypeFilter } : {}),
    ...(trackFilter ? { track: trackFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    page,
    pageSize: PAGE_SIZE,
  }), [search, contentTypeFilter, trackFilter, statusFilter, page]);

  const { data: scriptsData, isLoading, error } = useScripts(filters);

  // All content (scripts, social posts, news, clips) now lives in cc_scripts
  const scripts = useMemo(() => {
    const items = (scriptsData?.data ?? []).map(s => {
      // Clean title: strip code fences, JSON artifacts
      let title = s.title ?? 'Nội Dung Không Tên';
      if (title.startsWith('```') || title.startsWith('{')) {
        title = title
          .replace(/^```\w*\s*/, '')
          .replace(/```\s*$/, '')
          .replace(/^\{?\s*"?\s*/, '')
          .replace(/\s*"?\s*\}?$/, '')
          .trim();
        // If title is still empty or looks like JSON key, try to extract from body
        if (!title || title.includes('":')) {
          try {
            let bodyStr = (s.body ?? '').trim();
            if (bodyStr.startsWith('```')) bodyStr = bodyStr.replace(/^```\w*\n?/, '').replace(/\n?```\s*$/, '');
            const parsed = JSON.parse(bodyStr);
            title = parsed.title || parsed.summary?.slice(0, 80) || title;
          } catch { /* ignore */ }
        }
      }
      return { ...s, _source: 'script', title: title || 'Nội Dung Không Tên' };
    });

    switch (sortBy) {
      case 'oldest':
        items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'title_asc':
        items.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
        break;
      case 'title_desc':
        items.sort((a, b) => b.title.localeCompare(a.title, 'vi'));
        break;
      case 'word_count':
        items.sort((a, b) => ((b.word_count) ?? 0) - ((a.word_count) ?? 0));
        break;
      case 'newest':
      default:
        break; // DB already ordered by created_at DESC
    }

    return items;
  }, [scriptsData, sortBy]);

  const totalCount = scriptsData?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const hasActiveFilters = contentTypeFilter || trackFilter || statusFilter;

  // --- Handlers ---
  const handleClearFilters = useCallback(() => {
    setContentTypeFilter('');
    setTrackFilter('');
    setStatusFilter('');
    setSearch('');
    setPage(0);
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      addToast({ type: 'success', message: 'Đã xóa nội dung.' });
      setDeleteConfirmId(null);
    } catch {
      addToast({ type: 'error', message: 'Không thể xóa nội dung.' });
    }
  }, [deleteMutation, addToast]);

  const handleDuplicate = useCallback(async (_script) => {
    addToast({ type: 'info', message: 'Đang chuyển đến Trình Tạo Nội Dung AI...' });
    router.push('/ai-gen');
  }, [router, addToast]);

  // --- Stats summary ---
  const statsSummary = useMemo(() => {
    const total = totalCount;
    return { total };
  }, [totalCount]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-gold" />
          <div>
            <h1 className="font-heading text-xl font-bold text-txt">
              Tất Cả Nội Dung
            </h1>
            <p className="text-xs text-txt-3 mt-0.5">
              {statsSummary.total} nội dung
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <CCSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 w-auto cursor-pointer"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="title_asc">A &rarr; Z</option>
              <option value="title_desc">Z &rarr; A</option>
              <option value="word_count">Số từ</option>
            </CCSelect>
            <ArrowUpDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-3 pointer-events-none" />
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={Filter}
            onClick={() => setShowFilters(!showFilters)}
          >
            Bộ Lọc
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 rounded-full bg-gold inline-block" />
            )}
          </Button>
          <Button
            variant="gold"
            size="sm"
            icon={Plus}
            onClick={() => router.push('/ai-gen')}
          >
            Tạo Mới
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card variant="glass" padding="md">
        <div className="flex items-center gap-3">
          <Search size={18} className="text-txt-3 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Tìm kiếm kịch bản theo tiêu đề..."
            className="flex-1 bg-transparent text-sm text-txt placeholder:text-txt-3 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-txt-3 hover:text-txt transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </Card>

      {/* Filter Panel */}
      {showFilters && (
        <Card variant="glass" padding="md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-txt-2 uppercase tracking-wider">Bộ Lọc</span>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xxs text-gold hover:underline"
              >
                Xóa tất cả
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Sort */}
            <div>
              <label className="text-xxs text-txt-3 mb-1 block">Sắp Xếp</label>
              <CCSelect
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs w-full"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="title_asc">Tiêu đề A &rarr; Z</option>
                <option value="title_desc">Tiêu đề Z &rarr; A</option>
                <option value="word_count">Số từ nhiều nhất</option>
              </CCSelect>
            </div>

            {/* Content Type */}
            <div>
              <label className="text-xxs text-txt-3 mb-1 block">Loại Nội Dung</label>
              <CCSelect
                value={contentTypeFilter}
                onChange={(e) => { setContentTypeFilter(e.target.value); setPage(0); }}
                className="text-xs w-full"
              >
                <option value="">Tất cả</option>
                <option value="latc">LATC</option>
                <option value="tmt">TMT</option>
                <option value="short_clip">Clip Ngắn</option>
                <option value="social_post">Bài Đăng MXH</option>
                <option value="news">Tin Tức / Blog</option>
              </CCSelect>
            </div>

            {/* Track */}
            <div>
              <label className="text-xxs text-txt-3 mb-1 block">Track</label>
              <CCSelect
                value={trackFilter}
                onChange={(e) => { setTrackFilter(e.target.value); setPage(0); }}
                className="text-xs w-full"
              >
                <option value="">Tất cả</option>
                <option value="wealth">Wealth</option>
                <option value="wellness">Wellness</option>
                <option value="integration">Integration</option>
              </CCSelect>
            </div>

            {/* Status */}
            <div>
              <label className="text-xxs text-txt-3 mb-1 block">Trạng Thái</label>
              <CCSelect
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                className="text-xs w-full"
              >
                <option value="">Tất cả</option>
                <option value="draft">Bản Nháp</option>
                <option value="review">Chờ Duyệt</option>
                <option value="approved">Đã Duyệt</option>
                <option value="published">Đã Xuất Bản</option>
                <option value="archived">Lưu Trữ</option>
              </CCSelect>
            </div>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gold" />
          <span className="ml-3 text-sm text-txt-2">Đang tải danh sách...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card variant="glass" padding="lg">
          <div className="text-center py-8">
            <AlertTriangle size={36} className="mx-auto mb-3 text-danger" />
            <p className="text-sm text-danger mb-1">Không thể tải danh sách kịch bản</p>
            <p className="text-xxs text-txt-3">{error.message}</p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && scripts.length === 0 && (
        <EmptyState
          icon={FileText}
          title={search || hasActiveFilters ? 'Không tìm thấy kịch bản' : 'Chưa có kịch bản nào'}
          description={
            search || hasActiveFilters
              ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
              : 'Bắt đầu tạo kịch bản đầu tiên bằng Trình Tạo Nội Dung AI.'
          }
          actionLabel={search || hasActiveFilters ? 'Xóa Bộ Lọc' : 'Tạo Kịch Bản'}
          onAction={search || hasActiveFilters ? handleClearFilters : () => router.push('/ai-gen')}
        />
      )}

      {/* Scripts List */}
      {!isLoading && !error && scripts.length > 0 && (
        <div className="space-y-3">
          {scripts.map((script) => {
            // Auto-detect analysis scripts (job_type=analysis or wrongly tagged short_clip with analysis content)
            let contentType = script.content_type ?? 'latc';
            if (script.job_type === 'analysis' || (contentType === 'short_clip' && script.job_type === 'analysis')) {
              contentType = 'analysis';
            }
            const typeConfig = CONTENT_TYPE_CONFIG[contentType] ?? CONTENT_TYPE_CONFIG.latc;
            const TypeIcon = typeConfig.icon;
            const track = script.track ?? '';
            const trackConfig = TRACK_CONFIG[track];
            const status = script.status ?? 'draft';
            const statusCfg = (STATUS_CONFIG[status] ?? STATUS_CONFIG.draft);
            const wordCount = script.word_count;
            const title = script.title ?? 'Kịch Bản Không Tên';
            const createdAt = script.created_at ?? '';
            const updatedAt = script.updated_at ?? '';
            const id = script.id;

            return (
              <Card
                key={id}
                variant="glass"
                padding="none"
                hoverable
              >
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                  onClick={() => router.push(`/scripts/${id}`)}
                >
                  {/* Type Icon */}
                  <div className={`shrink-0 w-10 h-10 rounded-card bg-glass-bg flex items-center justify-center ${typeConfig.color}`}>
                    <TypeIcon size={20} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-txt truncate">
                        {title}
                      </h3>
                      <Badge
                        text={typeConfig.label}
                        variant={contentType === 'latc' ? 'gold' : contentType === 'tmt' ? 'key' : 'default'}
                        size="sm"
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xxs text-txt-3">
                      {trackConfig && (
                        <span className={trackConfig.color}>{trackConfig.label}</span>
                      )}
                      {wordCount && (
                        <span>{wordCount.toLocaleString('vi-VN')} từ</span>
                      )}
                      <span>{estimateDuration(wordCount)}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatTimeAgo(updatedAt || createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Status + Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      text={statusCfg.label}
                      variant={statusCfg.variant}
                      size="sm"
                      dot
                    />

                    {/* Action buttons */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/scripts/${id}`)}
                        className="p-1.5 rounded-badge text-txt-3 hover:text-txt hover:bg-bg-4 transition-all"
                        title="Xem chi tiết"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDuplicate(script)}
                        className="p-1.5 rounded-badge text-txt-3 hover:text-txt hover:bg-bg-4 transition-all"
                        title="Tạo bản sao"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(id)}
                        className="p-1.5 rounded-badge text-txt-3 hover:text-danger hover:bg-danger/10 transition-all"
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {deleteConfirmId === id && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-danger/5">
                    <span className="text-xs text-danger">
                      Xóa kịch bản &quot;{title}&quot;? Hành động không thể hoàn tác.
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Hủy
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        loading={deleteMutation.isPending}
                        onClick={() => handleDelete(id)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-txt-3">
            Trang {page + 1} / {totalPages} ({totalCount} kịch bản)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={ChevronLeft}
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Trước
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={ChevronRight}
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
