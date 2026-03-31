'use client';

// ============================================================================
// useAuth — Shared Authentication Hook
// GEM Content Control Center
//
// Hook xác thực dùng chung cho cả web và desktop.
// Bọc lại authService từ @gem/services, kết hợp với Zustand store
// để quản lý trạng thái xác thực và phân quyền.
// ============================================================================

import { useEffect, useCallback, useRef } from 'react';
import {
  useAppStore,
  getSession,
  getProfile,
  onAuthStateChange,
  authService,
} from '@gem/services';
import type { UserRole } from '@gem/types';

// ---------------------------------------------------------------------------
// Bảng phân quyền theo vai trò
// owner > editor > viewer (ai_agent không có quyền truy cập UI thông thường)
// ---------------------------------------------------------------------------

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 100,
  editor: 50,
  viewer: 10,
  ai_agent: 0,
};

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  owner: [
    'create', 'read', 'update', 'delete', 'approve', 'publish', 'generate',
    'manage_users', 'manage_settings', 'view_analytics', 'export',
  ],
  editor: [
    'create', 'read', 'update', 'generate', 'publish', 'view_analytics', 'export',
  ],
  viewer: [
    'read', 'view_analytics',
  ],
  ai_agent: [
    'read', 'generate',
  ],
};

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

export function useAuth() {
  const {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated,
    setUser,
    setProfile,
    setSession,
    setLoading,
    clearAuth,
  } = useAppStore();

  const subscriptionRef = useRef<ReturnType<typeof onAuthStateChange>>(null);
  const mountedRef = useRef(true);

  // -----------------------------------------------------------------------
  // Tải hồ sơ người dùng
  // -----------------------------------------------------------------------

  const loadProfile = useCallback(async () => {
    try {
      const result = await getProfile();
      if (!mountedRef.current) return;

      if (result.success && result.data) {
        setProfile(result.data);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('[useAuth] Lỗi tải hồ sơ:', err);
    }
  }, [setProfile]);

  // -----------------------------------------------------------------------
  // Khởi tạo xác thực
  // -----------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      try {
        setLoading(true);
        const sessionResult = await getSession();

        if (!mountedRef.current) return;

        if (sessionResult.success && sessionResult.data) {
          const currentSession = sessionResult.data;
          setSession(currentSession);
          setUser(currentSession.user ?? null);
          await loadProfile();
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        console.error('[useAuth] Lỗi khởi tạo:', err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    initialize();

    subscriptionRef.current = onAuthStateChange((event, newSession) => {
      if (!mountedRef.current) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        loadProfile();
      } else if (event === 'SIGNED_OUT') {
        clearAuth();
      }
    });

    return () => {
      mountedRef.current = false;
      subscriptionRef.current?.unsubscribe();
    };
  }, [setSession, setUser, setProfile, setLoading, clearAuth, loadProfile]);

  // -----------------------------------------------------------------------
  // Auth actions
  // -----------------------------------------------------------------------

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        const result = await authService.signIn(email, password);
        if (!result.success) {
          return { data: null, error: result.error ?? 'Đăng nhập thất bại.', success: false as const };
        }
        return { data: result.data, error: null, success: true as const };
      } catch (err) {
        const message = (err as Error)?.message ?? 'Lỗi không xác định khi đăng nhập.';
        return { data: null, error: message, success: false as const };
      } finally {
        setLoading(false);
      }
    },
    [setLoading],
  );

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const result = await authService.signOut();
      clearAuth();
      return {
        data: null,
        error: result.success ? null : (result.error ?? 'Đăng xuất thất bại.'),
        success: result.success,
      };
    } catch (err) {
      const message = (err as Error)?.message ?? 'Lỗi không xác định khi đăng xuất.';
      clearAuth();
      return { data: null, error: message, success: false as const };
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearAuth]);

  // -----------------------------------------------------------------------
  // Role & permission checks
  // -----------------------------------------------------------------------

  const hasRole = useCallback(
    (role: UserRole): boolean => {
      if (!profile?.role) return false;
      const userLevel = ROLE_HIERARCHY[profile.role] ?? 0;
      const requiredLevel = ROLE_HIERARCHY[role] ?? 0;
      return userLevel >= requiredLevel;
    },
    [profile],
  );

  const hasPermission = useCallback(
    (action: string): boolean => {
      if (!profile?.role) return false;
      const allowed = ROLE_PERMISSIONS[profile.role];
      if (!allowed) return false;
      return allowed.includes(action);
    },
    [profile],
  );

  // -----------------------------------------------------------------------
  // Convenience booleans
  // -----------------------------------------------------------------------

  const isOwner = hasRole('owner' as UserRole);
  const isEditor = hasRole('editor' as UserRole);
  const canCreate = hasPermission('create');
  const canDelete = hasPermission('delete');

  return {
    user,
    profile,
    session,
    loading: isLoading,
    error: null,
    isAuthenticated,

    signIn,
    signOut,

    isOwner,
    isEditor,
    canCreate,
    canDelete,

    hasRole,
    hasPermission,
  };
}
