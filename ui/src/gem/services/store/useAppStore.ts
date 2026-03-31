// ============================================================================
// useAppStore — Zustand Global Store
// GEM Content Control Center
//
// Store trung tâm quản lý trạng thái ứng dụng.
// Bao gồm 3 slice: Auth, UI, Notification.
// ============================================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile, Notification } from '@gem/types';

// ═══════════════════════════════════════════════════════════
// AUTH SLICE
// ═══════════════════════════════════════════════════════════

export interface AuthSlice {
  /** Người dùng Supabase Auth hiện tại */
  user: User | null;
  /** Hồ sơ người dùng từ bảng profiles */
  profile: Profile | null;
  /** Phiên đăng nhập hiện tại */
  session: Session | null;
  /** Đang tải trạng thái xác thực */
  isLoading: boolean;
  /** Đã xác thực (computed từ session) */
  isAuthenticated: boolean;

  // Hành động
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearAuth: () => void;
}

const createAuthSlice = (set: (partial: Partial<AppStore> | ((state: AppStore) => Partial<AppStore>), replace?: boolean, name?: string) => void): AuthSlice => ({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({ user }, false, 'auth/setUser'),

  setProfile: (profile) =>
    set({ profile }, false, 'auth/setProfile'),

  setSession: (session) =>
    set(
      { session, isAuthenticated: session !== null },
      false,
      'auth/setSession',
    ),

  setLoading: (isLoading) =>
    set({ isLoading }, false, 'auth/setLoading'),

  clearAuth: () =>
    set(
      {
        user: null,
        profile: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      },
      false,
      'auth/clearAuth',
    ),
});

// ═══════════════════════════════════════════════════════════
// UI SLICE
// ═══════════════════════════════════════════════════════════

export interface UISlice {
  /** Thanh bên thu gọn hay mở rộng */
  sidebarCollapsed: boolean;
  /** Modal đang mở (null = không có) */
  activeModal: string | null;
  /** Bảng lệnh nhanh đang mở */
  commandPaletteOpen: boolean;
  /** Chủ đề giao diện (chỉ hỗ trợ dark) */
  theme: 'dark';

  // Hành động
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  toggleCommandPalette: () => void;
}

const createUISlice = (set: (partial: Partial<AppStore> | ((state: AppStore) => Partial<AppStore>), replace?: boolean, name?: string) => void): UISlice => ({
  sidebarCollapsed: false,
  activeModal: null,
  commandPaletteOpen: false,
  theme: 'dark' as const,

  toggleSidebar: () =>
    set(
      (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
      false,
      'ui/toggleSidebar',
    ),

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }, false, 'ui/setSidebarCollapsed'),

  openModal: (modalId) =>
    set({ activeModal: modalId }, false, 'ui/openModal'),

  closeModal: () =>
    set({ activeModal: null }, false, 'ui/closeModal'),

  toggleCommandPalette: () =>
    set(
      (state) => ({ commandPaletteOpen: !state.commandPaletteOpen }),
      false,
      'ui/toggleCommandPalette',
    ),
});

// ═══════════════════════════════════════════════════════════
// NOTIFICATION SLICE
// ═══════════════════════════════════════════════════════════

export interface NotificationSlice {
  /** Số thông báo chưa đọc */
  unreadCount: number;
  /** Danh sách thông báo */
  notifications: Notification[];

  // Hành động
  setUnreadCount: (count: number) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  clearNotifications: () => void;
}

const createNotificationSlice = (set: (partial: Partial<AppStore> | ((state: AppStore) => Partial<AppStore>), replace?: boolean, name?: string) => void): NotificationSlice => ({
  unreadCount: 0,
  notifications: [],

  setUnreadCount: (count) =>
    set({ unreadCount: count }, false, 'notification/setUnreadCount'),

  addNotification: (notification) =>
    set(
      (state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }),
      false,
      'notification/addNotification',
    ),

  markAsRead: (notificationId) =>
    set(
      (state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }),
      false,
      'notification/markAsRead',
    ),

  clearNotifications: () =>
    set(
      { notifications: [], unreadCount: 0 },
      false,
      'notification/clearNotifications',
    ),
});

// ═══════════════════════════════════════════════════════════
// COMBINED STORE
// ═══════════════════════════════════════════════════════════

export type AppStore = AuthSlice & UISlice & NotificationSlice;

/**
 * Store chính của ứng dụng GEM Content Control Center.
 *
 * - **Auth slice**: trạng thái xác thực, hồ sơ người dùng
 * - **UI slice**: sidebar, modal, command palette, theme (persist vào localStorage)
 * - **Notification slice**: thông báo và số chưa đọc
 *
 * Sử dụng `devtools` trong môi trường development để hỗ trợ debug.
 */
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, _get, _api) => ({
        ...createAuthSlice(set as never),
        ...createUISlice(set as never),
        ...createNotificationSlice(set as never),
      }),
      {
        name: 'gem-cc-ui',
        partialize: (state: AppStore) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
        }),
      },
    ),
    {
      name: 'GEM Content Center',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
