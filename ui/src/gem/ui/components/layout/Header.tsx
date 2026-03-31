'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, User, Settings, ChevronDown, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  userName?: string;
  avatarUrl?: string;
  unreadCount?: number;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onSignOut?: () => void;
  /** Current resolved theme */
  resolvedTheme?: 'dark' | 'light';
  /** Toggle theme callback */
  onThemeToggle?: () => void;
}

export function Header({
  title,
  subtitle,
  userName,
  avatarUrl,
  unreadCount = 0,
  onNotificationClick,
  onProfileClick,
  onSettingsClick,
  onSignOut,
  resolvedTheme = 'dark',
  onThemeToggle,
}: HeaderProps): React.JSX.Element {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className="sticky top-0 z-header flex items-center justify-between px-6 h-header border-b border-border"
      style={{ background: 'var(--header-bg, rgba(7, 7, 12, 0.95))', backdropFilter: 'blur(12px)' }}
    >
      {/* Title */}
      <div>
        <h1 className="font-heading text-3xl font-semibold text-txt">{title}</h1>
        {subtitle && <p className="text-xs text-txt-2 mt-0.5">{subtitle}</p>}
      </div>

      {/* Right side: Status + Notifications + User */}
      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs text-txt-2">
          <span className="status-dot" />
          <span>Đang Hoạt Động</span>
        </div>

        {/* Theme toggle */}
        {onThemeToggle && (
          <button
            onClick={onThemeToggle}
            className="p-2 rounded-card text-txt-2 hover:text-txt hover:bg-[rgba(255,255,255,0.05)] transition-button"
            aria-label={resolvedTheme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            title={resolvedTheme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
          >
            {!mounted || resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}

        {/* Notification bell */}
        <button
          onClick={onNotificationClick}
          className="relative p-2 rounded-card text-txt-2 hover:text-txt hover:bg-[rgba(255,255,255,0.05)] transition-button"
          aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-danger text-white text-xxs font-bold px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-card hover:bg-[rgba(255,255,255,0.05)] transition-button"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName ?? 'Avatar'}
                className="w-8 h-8 rounded-full object-cover border border-border-2"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-bg-4 flex items-center justify-center border border-border-2">
                <User size={16} className="text-txt-2" />
              </div>
            )}
            <span className="text-sm text-txt hidden md:block">{userName ?? 'Người dùng'}</span>
            <ChevronDown size={14} className="text-txt-3" />
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-card border border-border-2 py-2 z-dropdown animate-fade-in"
              style={{ background: 'var(--bg-2)' }}
            >
              <button
                onClick={() => {
                  onProfileClick?.();
                  setShowDropdown(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-txt-2 hover:text-txt hover:bg-[rgba(255,255,255,0.03)] transition-button"
              >
                <User size={16} />
                <span>Hồ Sơ Người Dùng</span>
              </button>
              <button
                onClick={() => {
                  onSettingsClick?.();
                  setShowDropdown(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-txt-2 hover:text-txt hover:bg-[rgba(255,255,255,0.03)] transition-button"
              >
                <Settings size={16} />
                <span>Cài Đặt</span>
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => {
                  onSignOut?.();
                  setShowDropdown(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-danger hover:bg-[rgba(255,107,107,0.05)] transition-button"
              >
                <LogOut size={16} />
                <span>Đăng Xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
