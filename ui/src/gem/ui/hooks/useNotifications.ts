'use client';

// ============================================================================
// useNotifications — Shared Notification State Hook
// GEM Content Control Center
//
// Manages notification state: unread count, notification list,
// mark as read, and mark all read. Uses notificationService
// from @gem/services and syncs with the Zustand store.
// ============================================================================

import { useCallback } from 'react';
import {
  useAppStore,
  notificationService,
} from '@gem/services';

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Hook for managing notification state.
 *
 * @example
 * ```tsx
 * const { unreadCount, notifications, markRead, markAllRead } = useNotifications();
 * ```
 */
export function useNotifications() {
  const {
    user,
    unreadCount,
    notifications,
    setUnreadCount,
    markAsRead: markAsReadInStore,
    clearNotifications,
  } = useAppStore();

  // -----------------------------------------------------------------------
  // Mark single notification as read
  // -----------------------------------------------------------------------

  const markRead = useCallback(
    async (notificationId: string) => {
      // Optimistic update in store
      markAsReadInStore(notificationId);

      // Persist to Supabase
      const result = await notificationService.markAsRead(notificationId);
      if (!result.success) {
        console.error('[useNotifications] Lỗi đánh dấu đã đọc:', result.error);
      }
    },
    [markAsReadInStore],
  );

  // -----------------------------------------------------------------------
  // Mark all notifications as read
  // -----------------------------------------------------------------------

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;

    // Optimistic update
    clearNotifications();

    // Persist to Supabase
    const result = await notificationService.markAllRead(user.id);
    if (!result.success) {
      console.error('[useNotifications] Lỗi đánh dấu tất cả đã đọc:', result.error);
    }
  }, [user?.id, clearNotifications]);

  // -----------------------------------------------------------------------
  // Refresh unread count from server
  // -----------------------------------------------------------------------

  const refreshCount = useCallback(async () => {
    if (!user?.id) return;

    const result = await notificationService.getCount(user.id);
    if (result.success && result.data !== null) {
      setUnreadCount(result.data);
    }
  }, [user?.id, setUnreadCount]);

  return {
    unreadCount,
    notifications,
    markRead,
    markAllRead,
    refreshCount,
  };
}
