import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckCircle,
  Clock,
  Edit3,
  Sparkles,
  BookOpen,
  Users,
  Film,
  Share2,
  Type,
  Image,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  Calendar,
  Activity,
  Loader2,
  Mail,
  Send,
  MousePointer,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { useDashboardStats, useRecentActivity } from '@gem/hooks/useQueryHooks';

// ============================================================================
// Stat Card Component (inline for dashboard)
// ============================================================================

function DashboardStatCard({ stat }) {
  const colorClasses = {
    gold: 'sc gd',
    purple: 'sc pu',
    blue: 'sc bl',
    emerald: 'sc em',
  };

  const iconColorClasses = {
    gold: 'text-gold',
    purple: 'text-purple',
    blue: 'text-blue',
    emerald: 'text-emerald',
  };

  const Icon = stat.icon;

  return (
    <div className={colorClasses[stat.color]} title={stat.tooltip}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-txt-2 uppercase tracking-wider">{stat.label}</span>
        <Icon size={18} className={iconColorClasses[stat.color]} />
      </div>
      <div className="text-3xl font-heading font-bold text-txt mb-1">
        {stat.value.toLocaleString('vi-VN')}
      </div>
      {stat.change !== undefined && (
        <div className="flex items-center gap-1 text-xxs">
          {stat.change >= 0 ? (
            <>
              <TrendingUp size={12} className="text-success" />
              <span className="text-success">+{stat.change}%</span>
            </>
          ) : (
            <>
              <TrendingDown size={12} className="text-danger" />
              <span className="text-danger">{stat.change}%</span>
            </>
          )}
          <span className="text-txt-3 ml-1">so với tuần trước</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Quick Action Button
// ============================================================================

const quickActions = [
  { label: 'Tạo Kịch Bản AI', icon: Sparkles, href: '/admin/cc/ai-gen', color: 'text-gold' },
  { label: 'Kịch Bản LATC', icon: BookOpen, href: '/admin/cc/ai-gen', color: 'text-gold' },
  { label: 'Kịch Bản TMT', icon: Users, href: '/admin/cc/ai-gen', color: 'text-purple' },
  { label: 'Clip Ngắn', icon: Film, href: '/admin/cc/ai-gen', color: 'text-rose' },
  { label: 'Bài Đăng MXH', icon: Share2, href: '/admin/cc/ai-gen', color: 'text-blue' },
  { label: 'Tiêu Đề', icon: Type, href: '/admin/cc/ai-gen', color: 'text-amber' },
  { label: 'Tạo Hình Ảnh', icon: Image, href: '/admin/cc/image-gen', color: 'text-cyan' },
  { label: 'Lịch Nội Dung', icon: Calendar, href: '/admin/cc/calendar', color: 'text-emerald' },
];

// ============================================================================
// Content Pillars
// ============================================================================

const pillars = [
  {
    name: 'Tài Chính (Wealth)',
    description: 'Trading, LATC Money, đầu tư',
    color: 'text-gold',
    borderColor: 'border-l-gold',
    items: ['Chiến lược giao dịch', 'Luật Hấp Dẫn & Tiền', 'Tư duy triệu phú'],
  },
  {
    name: 'Tâm Thức (Wellness)',
    description: 'Thiền, tâm linh, chữa lành',
    color: 'text-purple',
    borderColor: 'border-l-purple',
    items: ['Thiền định hàng ngày', 'Chữa lành tổn thương', 'Nâng cao tần số'],
  },
  {
    name: 'Tích Hợp (Integration)',
    description: 'Lifestyle, cân bằng, ứng dụng',
    color: 'text-emerald',
    borderColor: 'border-l-emerald',
    items: ['Phong cách sống GEM', 'Cân bằng cuộc sống', 'Ứng dụng thực tế'],
  },
];

// ============================================================================
// Dashboard Page
// ============================================================================

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useRecentActivity(8);

  const statCards = [
    {
      label: 'Tổng Kịch Bản',
      value: stats?.totalScripts ?? 0,
      icon: FileText,
      color: 'gold',
      tooltip: 'Tổng số kịch bản đã tạo trên hệ thống',
    },
    {
      label: 'Đã Xuất Bản',
      value: stats?.publishedScripts ?? 0,
      icon: CheckCircle,
      color: 'emerald',
      tooltip: 'Kịch bản đã được duyệt và xuất bản',
    },
    {
      label: 'Chờ Duyệt',
      value: stats?.pendingReview ?? 0,
      icon: Clock,
      color: 'purple',
      tooltip: 'Kịch bản đang chờ kiểm duyệt nội dung',
    },
    {
      label: 'Bản Nháp',
      value: stats?.drafts ?? 0,
      icon: Edit3,
      color: 'blue',
      tooltip: 'Kịch bản đang trong quá trình soạn thảo',
    },
  ];

  const actionLabels = {
    create: 'đã tạo',
    update: 'đã cập nhật',
    delete: 'đã xóa',
    publish: 'đã xuất bản',
    approve: 'đã duyệt',
    reject: 'đã từ chối',
    login: 'đã đăng nhập',
    logout: 'đã đăng xuất',
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPI Stats Grid */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-xl font-semibold text-txt flex items-center gap-2">
            <LayoutDashboard size={20} className="text-gold" />
            Tổng Quan
          </h2>
          <button
            onClick={() => refetchStats()}
            className="flex items-center gap-1.5 text-xs text-txt-3 hover:text-txt transition-button"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={14} />
            <span>Làm Mới</span>
          </button>
        </div>

        {statsError ? (
          <div className="card p-6 text-center">
            <p className="text-danger text-sm mb-3">Không thể tải dữ liệu thống kê</p>
            <button
              onClick={() => refetchStats()}
              className="btn btn-o text-xs"
            >
              Thử Lại
            </button>
          </div>
        ) : (
          <div className="g4">
            {statCards.map((stat) => (
              <DashboardStatCard
                key={stat.label}
                stat={statsLoading ? { ...stat, value: 0 } : stat}
              />
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="font-heading text-xl font-semibold text-txt mb-5 flex items-center gap-2">
          <Sparkles size={20} className="text-gold" />
          Tạo Nhanh
        </h2>
        <div className="g4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="card p-4 flex items-center gap-4 hover:shadow-glass-hover transition-all duration-normal group"
              >
                <div className="w-10 h-10 rounded-card flex items-center justify-center group-hover:scale-110 transition-all duration-normal" style={{ background: 'rgba(15, 16, 48, 0.7)' }}>
                  <Icon size={20} className={action.color} />
                </div>
                <span className="text-sm text-txt-2 group-hover:text-txt transition-button flex-1">
                  {action.label}
                </span>
                <ArrowRight size={14} className="text-txt-3 opacity-0 group-hover:opacity-100 transition-all duration-normal" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Email Campaign Performance */}
      <EmailKPISection />

      {/* Two Column Layout: Pillars + Activity */}
      <div className="g2">
        {/* Content Pillars */}
        <section>
          <h2 className="font-heading text-xl font-semibold text-txt mb-5 flex items-center gap-2">
            <Activity size={20} className="text-gold" />
            Trụ Cột Nội Dung
          </h2>
          <div className="space-y-4">
            {pillars.map((pillar) => (
              <div
                key={pillar.name}
                className={`card p-5 border-l-[3px] ${pillar.borderColor}`}
              >
                <h3 className={`text-md font-semibold ${pillar.color} mb-2`}>
                  {pillar.name}
                </h3>
                <p className="text-xs text-txt-3 mb-3">{pillar.description}</p>
                <ul className="space-y-2">
                  {pillar.items.map((item) => (
                    <li key={item} className="text-sm text-txt-2 flex items-center gap-2">
                      <span className={`w-1 h-1 rounded-full ${pillar.color.replace('text-', 'bg-')}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h2 className="font-heading text-xl font-semibold text-txt mb-5 flex items-center gap-2">
            <Clock size={20} className="text-gold" />
            Hoạt Động Gần Đây
          </h2>
          <div className="card p-4">
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-txt-3" />
              </div>
            ) : !activities?.length ? (
              <div className="text-center py-8">
                <Activity size={32} className="mx-auto mb-3 text-txt-3" />
                <p className="text-sm text-txt-3">Chưa có hoạt động nào</p>
                <p className="text-xxs text-txt-3 mt-1">
                  Bắt đầu tạo nội dung để xem lịch sử hoạt động
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                  >
                    <div className="w-6 h-6 rounded-full bg-bg-4 flex items-center justify-center mt-0.5 shrink-0">
                      <Activity size={12} className="text-txt-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-txt-2 truncate">
                        <span className="text-txt font-medium">
                          {activity.entity_type ?? 'Hệ thống'}
                        </span>
                        {' '}
                        {actionLabels[activity.action ?? ''] ?? activity.action}
                      </p>
                      <p className="text-xxs text-txt-3 mt-0.5">
                        {activity.created_at
                          ? new Date(activity.created_at).toLocaleString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Weekly Schedule Preview */}
      <section>
        <h2 className="font-heading text-xl font-semibold text-txt mb-5 flex items-center gap-2">
          <Calendar size={20} className="text-gold" />
          Lịch Tuần Này
        </h2>
        <div className="card p-6">
          <div className="g4">
            {[
              { day: 'T2', track: 'Wealth', color: 'bg-gold', textColor: 'text-gold' },
              { day: 'T4', track: 'Wellness', color: 'bg-purple', textColor: 'text-purple' },
              { day: 'T6', track: 'Integration', color: 'bg-emerald', textColor: 'text-emerald' },
              { day: 'CN', track: 'Deep Dive', color: 'bg-blue', textColor: 'text-blue' },
            ].map((slot) => (
              <div key={slot.day} className="flex items-center gap-3 p-3 rounded-card" style={{ background: 'rgba(15, 16, 48, 0.55)', border: '1px solid rgba(106, 91, 255, 0.15)' }}>
                <div className={`w-8 h-8 rounded-badge ${slot.color} bg-opacity-20 flex items-center justify-center`}>
                  <span className={`text-xs font-bold ${slot.textColor}`}>{slot.day}</span>
                </div>
                <div>
                  <p className={`text-sm font-medium ${slot.textColor}`}>{slot.track}</p>
                  <p className="text-xxs text-txt-3">Chưa có nội dung</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link
              href="/admin/cc/calendar"
              className="text-xs text-txt-3 hover:text-gold transition-button inline-flex items-center gap-1"
            >
              Xem lịch đầy đủ
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}


// ============================================================================
// Email KPI Section — Hiệu suất email 30 ngày
// ============================================================================

function EmailKPISection() {
  const [kpis, setKpis] = useState(null);
  const [topCampaigns, setTopCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmailKPIs();
  }, []);

  async function loadEmailKPIs() {
    try {
      const { getSupabase } = await import('@gem/services/api/supabase');
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [kpiRes, campaignsRes] = await Promise.allSettled([
        supabase.rpc('get_email_dashboard_kpis', { p_user_id: user.id, p_days: 30 }),
        supabase
          .from('cc_email_campaigns')
          .select('id, name, subject, open_rate, revenue_attributed, sent_at')
          .eq('created_by', user.id)
          .eq('status', 'sent')
          .order('sent_at', { ascending: false })
          .limit(3),
      ]);

      if (kpiRes.status === 'fulfilled' && kpiRes.value.data) {
        setKpis(kpiRes.value.data);
      }
      if (campaignsRes.status === 'fulfilled' && campaignsRes.value.data) {
        setTopCampaigns(campaignsRes.value.data);
      }
    } catch (err) {
      console.warn('[CCDashboard] Email KPIs error:', err);
    } finally {
      setLoading(false);
    }
  }

  const emailStats = [
    { label: 'Campaigns', value: kpis?.total_campaigns ?? 0, icon: Mail, color: 'blue' },
    { label: 'Đã Gửi', value: kpis?.total_sent ?? 0, icon: Send, color: 'gold' },
    { label: 'Tỷ Lệ Mở', value: `${kpis?.avg_open_rate ?? 0}%`, icon: MousePointer, color: 'purple' },
    { label: 'ROI', value: kpis?.total_roi ? `${kpis.total_roi}%` : '—', icon: DollarSign, color: 'emerald' },
  ];

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading text-xl font-semibold text-txt flex items-center gap-2">
          <Mail size={20} className="text-gold" />
          Hiệu Suất Email (30 ngày)
        </h2>
        <Link
          href="/admin/cc/emails"
          className="text-xs text-txt-3 hover:text-gold transition-button inline-flex items-center gap-1"
        >
          Xem tất cả <ArrowRight size={12} />
        </Link>
      </div>

      {loading ? (
        <div className="card p-8 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-txt-3" />
        </div>
      ) : !kpis || kpis.total_campaigns === 0 ? (
        <div className="card p-8 text-center">
          <Mail size={32} className="mx-auto mb-3 text-txt-3 opacity-30" />
          <p className="text-sm text-txt-3">Chưa gửi email campaign nào</p>
          <p className="text-xxs text-txt-3 mt-1">
            Tạo email từ AI Tạo Nội Dung → Gửi Email để bắt đầu theo dõi hiệu suất
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="g4">
            {emailStats.map((stat) => (
              <DashboardStatCard key={stat.label} stat={stat} />
            ))}
          </div>
          {topCampaigns.length > 0 && (
            <div className="card p-4">
              <p className="text-xs text-txt-3 uppercase tracking-wider mb-3">Top Campaigns Gần Nhất</p>
              <div className="space-y-2">
                {topCampaigns.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/admin/cc/emails/${c.id}`}
                    className="flex items-center gap-3 py-2 px-2 rounded-card hover:bg-bg-3 transition-all group"
                  >
                    <span className="text-xs font-bold text-txt-3 w-5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-txt-2 truncate group-hover:text-txt transition-button">
                        {c.name || c.subject}
                      </p>
                    </div>
                    <span className="text-xs text-gold font-medium">{c.open_rate}% mở</span>
                    {c.revenue_attributed > 0 && (
                      <span className="text-xs text-emerald font-medium">
                        {Number(c.revenue_attributed).toLocaleString('vi-VN')}₫
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
