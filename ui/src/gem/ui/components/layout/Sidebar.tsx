'use client';

import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Image,
  Video,
  Repeat,
  GitBranch,
  Calendar,
  BarChart3,
  Settings,
  Network,
  Shield,
  ChevronLeft,
  ChevronRight,
  Zap,
  User,
  FileText,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  badge?: string;
  badgeVariant?: 'gold' | 'new' | 'key' | 'v3';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'NỘI DUNG',
    items: [
      { id: 'dashboard', label: 'Bảng Điều Khiển', icon: LayoutDashboard, href: '/dashboard' },
      { id: 'ai-gen', label: 'Trình Tạo Nội Dung AI', icon: Sparkles, href: '/ai-gen', badge: 'MỚI', badgeVariant: 'new' },
      { id: 'scripts', label: 'Tất Cả Kịch Bản', icon: FileText, href: '/scripts' },
      { id: 'image-gen', label: 'Tạo Hình Ảnh', icon: Image, href: '/image-gen' },
    ],
  },
  {
    title: 'HẬU KỲ',
    items: [
      { id: 'video-reels', label: 'Xử Lý Video', icon: Video, href: '/video-reels' },
      { id: 'repurpose', label: 'Tái Sử Dụng', icon: Repeat, href: '/repurpose' },
      { id: 'funnels', label: 'Phễu & CTA', icon: GitBranch, href: '/funnels' },
      { id: 'calendar', label: 'Lịch Nội Dung', icon: Calendar, href: '/calendar' },
    ],
  },
  {
    title: 'PHÂN TÍCH',
    items: [
      { id: 'analytics', label: 'Phân Tích YouTube', icon: BarChart3, href: '/analytics', badge: 'QUAN TRỌNG', badgeVariant: 'key' },
    ],
  },
  {
    title: 'HỆ THỐNG',
    items: [
      { id: 'settings', label: 'Cài Đặt', icon: Settings, href: '/settings' },
      { id: 'brand', label: 'Khóa Giọng Thương Hiệu', icon: Shield, href: '/brand', badge: 'QUAN TRỌNG', badgeVariant: 'key' },
      { id: 'arch', label: 'Kiến Trúc Hệ Thống', icon: Network, href: '/arch' },
      { id: 'optim', label: '37 Tối Ưu Hóa', icon: Zap, href: '/optim', badge: 'MỚI', badgeVariant: 'new' },
      { id: 'profile', label: 'Hồ Sơ', icon: User, href: '/profile' },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  /** Current pathname for active state highlighting */
  pathname?: string;
  /** Custom link component (e.g., Next.js Link). Defaults to <a>. */
  LinkComponent?: React.ComponentType<{ href: string; className?: string; title?: string; children: React.ReactNode }>;
}

export function Sidebar({ collapsed = false, onToggle, pathname = '/', LinkComponent }: SidebarProps): React.JSX.Element {
  const LinkEl = LinkComponent ?? 'a';

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-sidebar flex flex-col transition-all duration-slow ease-glass ${
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      }`}
      style={{ background: 'var(--bg)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-heading text-xl font-bold gradient-text-gold">
              GEM
            </span>
            <span className="text-xxs text-txt-2 tracking-wider uppercase">
              Content Control Center
            </span>
          </div>
        )}
        {collapsed && (
          <span className="font-heading text-xl font-bold gradient-text-gold mx-auto">
            G
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <div className="px-3 mb-2 text-xxs font-semibold text-txt-3 uppercase tracking-wider">
                {section.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                const Icon = item.icon;

                return (
                  <li key={item.id}>
                    <LinkEl
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-card text-sm transition-button ${
                        isActive
                          ? 'bg-[rgba(212,168,83,0.12)] text-gold border-l-[3px] border-l-gold pl-[9px]'
                          : 'text-txt-2 hover:text-txt hover:bg-[rgba(255,255,255,0.03)]'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        size={18}
                        className={isActive ? 'text-gold' : 'text-txt-3'}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`badge ${
                                item.badgeVariant === 'gold'
                                  ? 'badge-gold'
                                  : item.badgeVariant === 'new'
                                  ? 'badge-new'
                                  : item.badgeVariant === 'key'
                                  ? 'badge-key'
                                  : 'badge-v3'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </LinkEl>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center py-3 border-t border-border text-txt-3 hover:text-txt transition-button"
        aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
