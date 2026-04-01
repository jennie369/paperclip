import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from '@/lib/router';
import {
  ArrowLeft,
  Mail,
  Send,
  Copy,
  Users,
  Eye,
  MousePointerClick,
  AlertTriangle,
  DollarSign,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  Clock,
  BarChart3,
  RefreshCw,
  ShoppingCart,
  Target,
  FileText,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('vi-VN');
}

function formatVND(n) {
  if (n == null) return '0 ₫';
  return Number(n).toLocaleString('vi-VN') + ' ₫';
}

function pct(part, total) {
  if (!total) return '0';
  return ((part / total) * 100).toFixed(1);
}

function generateMockHourlyData(sentAt) {
  const base = sentAt ? new Date(sentAt) : new Date();
  const data = [];
  for (let i = 0; i < 24; i++) {
    const t = new Date(base.getTime() + i * 3600000);
    const label = t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const opens = Math.max(0, Math.floor(80 * Math.exp(-i * 0.15) + Math.random() * 15));
    const clicks = Math.max(0, Math.floor(opens * (0.25 + Math.random() * 0.15)));
    data.push({ time: label, opens, clicks });
  }
  return data;
}

function generateMockDailyData(sentAt) {
  const base = sentAt ? new Date(sentAt) : new Date();
  const data = [];
  for (let i = 0; i < 7; i++) {
    const t = new Date(base.getTime() + i * 86400000);
    const label = t.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    const opens = Math.max(0, Math.floor(120 * Math.exp(-i * 0.35) + Math.random() * 20));
    const clicks = Math.max(0, Math.floor(opens * (0.2 + Math.random() * 0.15)));
    data.push({ time: label, opens, clicks });
  }
  return data;
}

// ============================================================================
// Status helpers
// ============================================================================

function statusIcon(status) {
  switch (status) {
    case 'opened':
      return <Check size={12} className="text-[#3AF7A6]" />;
    case 'delivered':
      return <Mail size={12} className="text-[#00F0FF]" />;
    case 'bounced':
      return <X size={12} className="text-[#FF6B6B]" />;
    default:
      return <Clock size={12} className="text-txt-3" />;
  }
}

function statusLabel(status) {
  switch (status) {
    case 'opened':
      return 'Đã mở';
    case 'delivered':
      return 'Đã nhận';
    case 'bounced':
      return 'Bounce';
    default:
      return status || '—';
  }
}

function statusBadgeClasses(status) {
  switch (status) {
    case 'opened':
      return 'bg-[#3AF7A6]/12 text-[#3AF7A6]';
    case 'delivered':
      return 'bg-[#00F0FF]/12 text-[#00F0FF]';
    case 'bounced':
      return 'bg-[#FF6B6B]/10 text-[#FF6B6B]';
    default:
      return 'bg-bg-4 text-txt-3';
  }
}

// ============================================================================
// Custom Tooltip for Chart
// ============================================================================

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[rgba(15,16,48,0.95)] border border-border rounded-lg p-2.5 text-[11px]">
      <div className="text-txt-2 mb-1">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-txt-2">
            {entry.dataKey === 'opens' ? 'Lượt mở' : 'Lượt click'}:
          </span>
          <span className="text-white font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const SENDS_PER_PAGE = 15;

export default function CCEmailCampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Data state
  const [campaign, setCampaign] = useState(null);
  const [sends, setSends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chart
  const [chartTab, setChartTab] = useState('hourly');

  // Recipients table
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);

  // Copy feedback
  const [copied, setCopied] = useState(false);

  // --------------------------------------------------------------------------
  // Fetch data
  // --------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [campaignRes, sendsRes] = await Promise.all([
        supabase.from('cc_email_campaigns').select('*').eq('id', id).single(),
        supabase
          .from('cc_email_sends')
          .select('*')
          .eq('campaign_id', id)
          .order('created_at', { ascending: false }),
      ]);

      if (campaignRes.error) throw campaignRes.error;
      setCampaign(campaignRes.data);
      setSends(sendsRes.data || []);
    } catch (err) {
      console.error('Fetch campaign detail error:', err);
      setError(err.message || 'Không thể tải dữ liệu chiến dịch');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  // --------------------------------------------------------------------------
  // Computed values
  // --------------------------------------------------------------------------

  const kpis = useMemo(() => {
    if (!campaign) return null;
    const totalSent = campaign.total_sent || 0;
    const totalDelivered = campaign.total_delivered || 0;
    const totalOpened = campaign.total_opened || 0;
    const totalClicked = campaign.total_clicked || 0;
    const totalBounced = campaign.total_bounced || 0;
    const revenue = campaign.revenue_attributed || 0;

    return {
      sent: totalSent,
      delivered: totalDelivered,
      deliveredPct: pct(totalDelivered, totalSent),
      opened: totalOpened,
      openRate: campaign.open_rate ?? pct(totalOpened, totalDelivered),
      clicked: totalClicked,
      clickRate: campaign.click_rate ?? pct(totalClicked, totalDelivered),
      bounced: totalBounced,
      bounceRate: campaign.bounce_rate ?? pct(totalBounced, totalSent),
      revenue,
    };
  }, [campaign]);

  const chartData = useMemo(() => {
    if (!campaign) return [];
    return chartTab === 'hourly'
      ? generateMockHourlyData(campaign.sent_at)
      : generateMockDailyData(campaign.sent_at);
  }, [campaign, chartTab]);

  // ROI calculations
  const roi = useMemo(() => {
    if (!campaign) return { cost: 0, revenue: 0, roiPct: 0, conversions: 0 };
    const cost = campaign.send_cost || 0;
    const revenue = campaign.revenue_attributed || 0;
    const roiPct = cost > 0 ? (((revenue - cost) / cost) * 100).toFixed(1) : 0;
    const conversionSends = sends.filter((s) => s.conversion_event);
    return { cost, revenue, roiPct, conversions: conversionSends.length, conversionSends };
  }, [campaign, sends]);

  // Filtered / paginated sends
  const filteredSends = useMemo(() => {
    let result = sends;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          (s.email || '').toLowerCase().includes(q) ||
          (s.recipient_name || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }
    return result;
  }, [sends, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredSends.length / SENDS_PER_PAGE);
  const paginatedSends = filteredSends.slice(
    (currentPage - 1) * SENDS_PER_PAGE,
    currentPage * SENDS_PER_PAGE
  );

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  const handleCopyHTML = useCallback(() => {
    if (!campaign?.html_body) return;
    navigator.clipboard.writeText(campaign.html_body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [campaign]);

  const handleDownloadHTML = useCallback(() => {
    if (!campaign?.html_body) return;
    const blob = new Blob([campaign.html_body], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-${campaign.name || id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [campaign, id]);

  const handleExportCSV = useCallback(() => {
    if (!filteredSends.length) return;
    const header = 'Email,Trạng Thái,Lượt Mở,Lượt Click,Chuyển Đổi\n';
    const rows = filteredSends
      .map(
        (s) =>
          `${s.email || ''},${statusLabel(s.status)},${s.open_count || 0},${s.click_count || 0},${s.conversion_event || ''}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recipients-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredSends, id]);

  // --------------------------------------------------------------------------
  // Render: Loading / Error
  // --------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-txt-3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 px-5">
        <AlertTriangle size={32} className="mx-auto mb-2.5 text-[#FF6B6B]/60" />
        <div className="text-[14px] text-white/35">{error}</div>
        <button
          onClick={fetchData}
          className="mt-3 h-8 px-3.5 text-[12px] font-semibold rounded-lg border-none cursor-pointer inline-flex items-center gap-1.5 bg-[#FFBD59]/15 text-[#FFBD59] hover:bg-[#FFBD59]/25 transition-colors"
        >
          <RefreshCw size={14} />
          Thử lại
        </button>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-20 px-5">
        <Mail size={32} className="mx-auto mb-2.5 text-white/10" />
        <div className="text-[14px] text-white/35">Không tìm thấy chiến dịch</div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-5 max-md:px-4">
      {/* ================================================================== */}
      {/* 1. Header */}
      {/* ================================================================== */}
      <div className="flex items-start justify-between gap-3 mb-5 max-md:flex-col">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={() => navigate('/GEM/cc/email')}
            className="h-8 px-3 text-[12px] font-semibold rounded-lg border border-border bg-transparent text-txt-2 cursor-pointer inline-flex items-center gap-1.5 hover:bg-bg-3 hover:text-txt transition-colors flex-shrink-0 mt-0.5"
          >
            <ArrowLeft size={14} />
            Quay lại
          </button>
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold text-white mb-0.5 truncate">
              {campaign.name || 'Chiến dịch email'}
            </h1>
            <p className="text-[12px] text-txt-3 truncate">{campaign.subject}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button className="h-8 px-3.5 text-[12px] font-semibold rounded-lg border-none cursor-pointer inline-flex items-center gap-1.5 bg-[#6A5BFF]/12 text-[#6A5BFF] hover:bg-[#6A5BFF]/20 transition-colors">
            <RefreshCw size={14} />
            Tái Sử Dụng
          </button>
          <button className="h-8 px-3.5 text-[12px] font-semibold rounded-lg border-none cursor-pointer inline-flex items-center gap-1.5 bg-[#FFBD59]/15 text-[#FFBD59] hover:bg-[#FFBD59]/25 transition-colors">
            <Copy size={14} />
            Clone
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 2. Campaign Info Card */}
      {/* ================================================================== */}
      <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-4 mb-4">
        <h3 className="text-[16px] font-bold text-[#FFBD59] mb-3">Thông Tin Chiến Dịch</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 max-md:grid-cols-1">
          <InfoRow label="Chủ đề" value={campaign.subject || '—'} />
          <InfoRow
            label="Từ"
            value={
              campaign.from_name
                ? `${campaign.from_name} <${campaign.from_email || ''}>`
                : campaign.from_email || '—'
            }
          />
          <InfoRow label="Gửi lúc" value={formatDate(campaign.sent_at)} />
          <InfoRow
            label="Đối tượng"
            value={`${campaign.audience_type || 'Tất cả'} (${formatNumber(campaign.audience_count || campaign.total_sent)} người)`}
          />
          <InfoRow label="Track" value={campaign.track || '—'} />
          <InfoRow
            label="Tags"
            value={
              campaign.tags && campaign.tags.length > 0 ? (
                <div className="flex gap-1 flex-wrap">
                  {(Array.isArray(campaign.tags) ? campaign.tags : [campaign.tags]).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center h-[22px] px-2 text-[10px] font-semibold rounded bg-[#6A5BFF]/12 text-[#6A5BFF]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                '—'
              )
            }
          />
        </div>
      </div>

      {/* ================================================================== */}
      {/* 3. KPI Cards */}
      {/* ================================================================== */}
      {kpis && (
        <div className="grid grid-cols-6 gap-2.5 mb-4 max-lg:grid-cols-3 max-md:grid-cols-2">
          <KPICard
            icon={Send}
            label="Gửi"
            value={formatNumber(kpis.sent)}
            color="#00F0FF"
          />
          <KPICard
            icon={Mail}
            label="Nhận"
            value={formatNumber(kpis.delivered)}
            sub={`${kpis.deliveredPct}%`}
            color="#3AF7A6"
          />
          <KPICard
            icon={Eye}
            label="Mở"
            value={formatNumber(kpis.opened)}
            sub={`${kpis.openRate}%`}
            color="#FFBD59"
          />
          <KPICard
            icon={MousePointerClick}
            label="Click"
            value={formatNumber(kpis.clicked)}
            sub={`${kpis.clickRate}%`}
            color="#6A5BFF"
          />
          <KPICard
            icon={AlertTriangle}
            label="Thoát"
            value={formatNumber(kpis.bounced)}
            sub={`${kpis.bounceRate}%`}
            color="#FF6B6B"
          />
          <KPICard
            icon={DollarSign}
            label="Doanh Thu"
            value={formatVND(kpis.revenue)}
            color="#3AF7A6"
          />
        </div>
      )}

      {/* ================================================================== */}
      {/* 4. Performance Chart */}
      {/* ================================================================== */}
      <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3 max-md:flex-col max-md:items-start max-md:gap-2">
          <h3 className="text-[16px] font-bold text-[#FFBD59]">Hiệu Suất Gửi</h3>
          <div className="flex gap-0 bg-white/[0.03] rounded-lg p-0.5 w-fit">
            <button
              onClick={() => setChartTab('hourly')}
              className={`h-7 px-3.5 text-[11px] font-semibold rounded-md border-none cursor-pointer transition-colors ${
                chartTab === 'hourly'
                  ? 'bg-[#FFBD59]/15 text-[#FFBD59]'
                  : 'bg-transparent text-txt-3 hover:text-txt-2'
              }`}
            >
              Theo Giờ
            </button>
            <button
              onClick={() => setChartTab('daily')}
              className={`h-7 px-3.5 text-[11px] font-semibold rounded-md border-none cursor-pointer transition-colors ${
                chartTab === 'daily'
                  ? 'bg-[#FFBD59]/15 text-[#FFBD59]'
                  : 'bg-transparent text-txt-3 hover:text-txt-2'
              }`}
            >
              Theo Ngày
            </button>
          </div>
        </div>

        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="gradOpens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFBD59" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FFBD59" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6A5BFF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6A5BFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="time"
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="opens"
                stroke="#FFBD59"
                strokeWidth={2}
                fill="url(#gradOpens)"
                name="Lượt mở"
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#6A5BFF"
                strokeWidth={2}
                fill="url(#gradClicks)"
                name="Lượt click"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-5 mt-2.5 justify-center">
          <div className="flex items-center gap-1.5 text-[11px] text-white/50">
            <span className="w-3 h-[3px] rounded-full bg-[#FFBD59]" />
            Lượt mở
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/50">
            <span className="w-3 h-[3px] rounded-full bg-[#6A5BFF]" />
            Lượt click
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 5. ROI & Conversions */}
      {/* ================================================================== */}
      <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-4 mb-4">
        <h3 className="text-[16px] font-bold text-[#FFBD59] mb-3">ROI & Chuyển Đổi</h3>

        <div className="grid grid-cols-4 gap-2.5 mb-4 max-md:grid-cols-2">
          <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5 text-center">
            <DollarSign size={20} className="mx-auto mb-1.5 text-[#FF6B6B] opacity-70" />
            <div className="text-[18px] font-bold text-white">{formatVND(roi.cost)}</div>
            <div className="text-[11px] text-txt-3 mt-0.5">Chi phí gửi</div>
          </div>
          <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5 text-center">
            <DollarSign size={20} className="mx-auto mb-1.5 text-[#3AF7A6] opacity-70" />
            <div className="text-[18px] font-bold text-white">{formatVND(roi.revenue)}</div>
            <div className="text-[11px] text-txt-3 mt-0.5">Doanh thu gán</div>
          </div>
          <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5 text-center">
            <Target size={20} className="mx-auto mb-1.5 text-[#FFBD59] opacity-70" />
            <div className="text-[18px] font-bold text-white">{roi.roiPct}%</div>
            <div className="text-[11px] text-txt-3 mt-0.5">ROI</div>
          </div>
          <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5 text-center">
            <ShoppingCart size={20} className="mx-auto mb-1.5 text-[#6A5BFF] opacity-70" />
            <div className="text-[18px] font-bold text-white">{roi.conversions}</div>
            <div className="text-[11px] text-txt-3 mt-0.5">Số đơn chuyển đổi</div>
          </div>
        </div>

        {/* Conversions table */}
        {roi.conversionSends && roi.conversionSends.length > 0 ? (
          <div className="overflow-x-auto rounded-xl bg-[rgba(15,16,48,0.2)]">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                    Email
                  </th>
                  <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                    Sự Kiện
                  </th>
                  <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                    Thời Gian
                  </th>
                </tr>
              </thead>
              <tbody>
                {roi.conversionSends.map((s) => (
                  <tr key={s.id} className="hover:[&>td]:bg-bg-3">
                    <td className="p-2.5 text-[#E0E0F0] border-b border-white/[0.02] align-middle">
                      {s.email || '—'}
                    </td>
                    <td className="p-2.5 text-[#E0E0F0] border-b border-white/[0.02] align-middle">
                      <span className="inline-flex items-center h-[22px] px-2 text-[10px] font-semibold rounded bg-[#3AF7A6]/12 text-[#3AF7A6]">
                        {s.conversion_event}
                      </span>
                    </td>
                    <td className="p-2.5 text-txt-3 border-b border-white/[0.02] align-middle">
                      {formatDate(s.converted_at || s.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6">
            <ShoppingCart size={24} className="mx-auto mb-1.5 text-white/10" />
            <div className="text-[12px] text-txt-3">Chưa có chuyển đổi nào</div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* 6. Recipients Table */}
      {/* ================================================================== */}
      <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3 max-md:flex-col max-md:items-start max-md:gap-2">
          <h3 className="text-[16px] font-bold text-[#FFBD59]">
            Danh Sách Người Nhận ({formatNumber(filteredSends.length)})
          </h3>
          <button
            onClick={handleExportCSV}
            className="h-8 px-3.5 text-[12px] font-semibold rounded-lg border-none cursor-pointer inline-flex items-center gap-1.5 bg-[#3AF7A6]/12 text-[#3AF7A6] hover:bg-[#3AF7A6]/20 transition-colors"
          >
            <Download size={14} />
            Xuất CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 mb-3 max-md:flex-col max-md:items-stretch">
          <div className="relative flex-1 max-w-[280px] max-md:max-w-none">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-3"
            />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 w-full pl-8 pr-3 text-[12px] bg-bg-4 border border-border rounded-lg text-white placeholder:text-txt-3 focus:border-purple/40 focus:outline-none transition-colors"
              placeholder="Tìm theo email..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-8 px-2.5 text-[12px] bg-bg-4 border border-border rounded-lg text-txt-2 focus:border-purple/40 focus:outline-none transition-colors cursor-pointer appearance-none"
            style={{ paddingRight: '28px' }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="opened">Đã mở</option>
            <option value="delivered">Đã nhận</option>
            <option value="bounced">Bounce</option>
          </select>
        </div>

        {/* Table */}
        {paginatedSends.length > 0 ? (
          <div className="overflow-x-auto rounded-xl bg-[rgba(15,16,48,0.2)]">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                    Email
                  </th>
                  <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                    Trạng Thái
                  </th>
                  <th className="text-center p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                    Mở
                  </th>
                  <th className="text-center p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                    Click
                  </th>
                  <th className="text-left p-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 border-b border-white/[0.04] whitespace-nowrap">
                    Chuyển Đổi
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedSends.map((send) => (
                  <tr key={send.id} className="hover:[&>td]:bg-bg-3">
                    <td className="p-2.5 text-[#E0E0F0] border-b border-white/[0.02] align-middle">
                      <div className="text-[12px] font-medium text-white">{send.email || '—'}</div>
                    </td>
                    <td className="p-2.5 border-b border-white/[0.02] align-middle">
                      <span
                        className={`inline-flex items-center gap-1 h-[22px] px-2 text-[10px] font-semibold rounded ${statusBadgeClasses(send.status)}`}
                      >
                        {statusIcon(send.status)}
                        {statusLabel(send.status)}
                      </span>
                    </td>
                    <td className="p-2.5 text-center text-[#E0E0F0] border-b border-white/[0.02] align-middle">
                      {send.open_count || 0}
                    </td>
                    <td className="p-2.5 text-center text-[#E0E0F0] border-b border-white/[0.02] align-middle">
                      {send.click_count || 0}
                    </td>
                    <td className="p-2.5 border-b border-white/[0.02] align-middle">
                      {send.conversion_event ? (
                        <span className="inline-flex items-center h-[22px] px-2 text-[10px] font-semibold rounded bg-[#3AF7A6]/12 text-[#3AF7A6]">
                          {send.conversion_event}
                        </span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users size={32} className="mx-auto mb-2.5 text-white/10" />
            <div className="text-[14px] text-white/35">Không tìm thấy người nhận</div>
            <div className="text-[12px] text-white/20 mt-1">Thử thay đổi bộ lọc</div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <div className="text-[11px] text-white/35">
              Trang {currentPage} / {totalPages}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 cursor-pointer hover:bg-bg-3 hover:text-txt transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 cursor-pointer hover:bg-bg-3 hover:text-txt transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* 7. Email Preview */}
      {/* ================================================================== */}
      <div className="bg-[rgba(15,16,48,0.35)] rounded-xl mb-4 overflow-hidden">
        <button
          onClick={() => setPreviewOpen(!previewOpen)}
          className="w-full flex items-center justify-between p-4 border-none bg-transparent cursor-pointer text-left hover:bg-[rgba(26,27,58,0.55)] transition-colors"
        >
          <h3 className="text-[16px] font-bold text-[#FFBD59]">Xem Trước Email</h3>
          {previewOpen ? (
            <ChevronUp size={18} className="text-txt-3" />
          ) : (
            <ChevronDown size={18} className="text-txt-3" />
          )}
        </button>

        {previewOpen && (
          <div className="px-4 pb-4">
            {/* Action buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleCopyHTML}
                className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 cursor-pointer inline-flex items-center gap-1 hover:bg-bg-3 hover:text-txt transition-colors"
              >
                {copied ? <Check size={14} className="text-[#3AF7A6]" /> : <Copy size={14} />}
                {copied ? 'Đã copy' : 'Copy HTML'}
              </button>
              <button
                onClick={handleDownloadHTML}
                className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-border bg-transparent text-txt-2 cursor-pointer inline-flex items-center gap-1 hover:bg-bg-3 hover:text-txt transition-colors"
              >
                <Download size={14} />
                Tải Xuống
              </button>
            </div>

            {/* HTML Preview */}
            {campaign.html_body ? (
              <div
                className="bg-white rounded-lg overflow-hidden max-h-[500px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: campaign.html_body }}
              />
            ) : (
              <div className="text-center py-8">
                <FileText size={24} className="mx-auto mb-1.5 text-white/10" />
                <div className="text-[12px] text-txt-3">Không có nội dung HTML</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[12px] text-txt-3 min-w-[80px] flex-shrink-0">{label}:</span>
      <span className="text-[12px] text-[#E0E0F0] break-all">
        {typeof value === 'string' || typeof value === 'number' ? value : value}
      </span>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-[rgba(15,16,48,0.35)] rounded-xl p-3.5 text-center">
      <Icon size={20} className="mx-auto mb-1.5 opacity-70" style={{ color }} />
      <div className="text-[18px] font-bold text-white">{value}</div>
      <div className="text-[11px] text-txt-3 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] font-semibold mt-0.5" style={{ color }}>{sub}</div>}
    </div>
  );
}
