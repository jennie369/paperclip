'use client';

// ============================================================================
// useAuth — Hook xác thực người dùng
// GEM Content Control Center
//
// Quản lý toàn bộ luồng đăng nhập, đăng ký, đăng xuất,
// kiểm tra phiên, và phân quyền theo vai trò.
// ============================================================================

import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@gem/services';
import {
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

/** Các hành động mà từng vai trò được phép thực hiện */
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
  // Tải hồ sơ người dùng từ bảng profiles
  // -----------------------------------------------------------------------

  const loadProfile = useCallback(async () => {
    try {
      const result = await getProfile();
      if (!mountedRef.current) return;

      if (result.success && result.data) {
        setProfile(result.data);
      } else {
        console.warn(
          '[useAuth] Không thể tải hồ sơ người dùng:',
          result.error,
        );
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error(
        '[useAuth] Lỗi không xác định khi tải hồ sơ người dùng:',
        err,
      );
    }
  }, [setProfile]);

  // -----------------------------------------------------------------------
  // Khởi tạo: kiểm tra phiên hiện tại + lắng nghe thay đổi xác thực
  // -----------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      try {
        setLoading(true);

        // Kiểm tra phiên đăng nhập hiện tại
        const sessionResult = await getSession();

        if (!mountedRef.current) return;

        if (sessionResult.success && sessionResult.data) {
          const currentSession = sessionResult.data;
          setSession(currentSession);
          setUser(currentSession.user ?? null);

          // Tải hồ sơ người dùng
          await loadProfile();
        } else {
          // Không có phiên đăng nhập — đặt trạng thái sạch
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        console.error(
          '[useAuth] Lỗi không xác định khi khởi tạo xác thực:',
          err,
        );
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initialize();

    // Đăng ký lắng nghe thay đổi trạng thái xác thực
    subscriptionRef.current = onAuthStateChange((event, newSession) => {
      if (!mountedRef.current) return;

      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        loadProfile();
      } else if (event === 'SIGNED_OUT') {
        clearAuth();
      }
    });

    // Dọn dẹp khi unmount
    return () => {
      mountedRef.current = false;
      subscriptionRef.current?.unsubscribe();
    };
  }, [setSession, setUser, setProfile, setLoading, clearAuth, loadProfile]);

  // -----------------------------------------------------------------------
  // Đăng nhập
  // -----------------------------------------------------------------------

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        const result = await authService.signIn(email, password);

        if (!result.success) {
          return {
            data: null,
            error: result.error ?? 'Đăng nhập thất bại. Vui lòng thử lại.',
            success: false as const,
          };
        }

        return {
          data: result.data,
          error: null,
          success: true as const,
        };
      } catch (err) {
        const message =
          (err as Error)?.message ??
          'Đã xảy ra lỗi không xác định khi đăng nhập.';
        return { data: null, error: message, success: false as const };
      } finally {
        setLoading(false);
      }
    },
    [setLoading],
  );

  // -----------------------------------------------------------------------
  // Đăng ký
  // -----------------------------------------------------------------------

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        setLoading(true);
        const result = await authService.signUp({ email, password, fullName });

        if (!result.success) {
          return {
            data: null,
            error: result.error ?? 'Đăng ký thất bại. Vui lòng thử lại.',
            success: false as const,
          };
        }

        return {
          data: result.data,
          error: null,
          success: true as const,
        };
      } catch (err) {
        const message =
          (err as Error)?.message ??
          'Đã xảy ra lỗi không xác định khi đăng ký.';
        return { data: null, error: message, success: false as const };
      } finally {
        setLoading(false);
      }
    },
    [setLoading],
  );

  // -----------------------------------------------------------------------
  // Đăng xuất
  // -----------------------------------------------------------------------

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const result = await authService.signOut();

      if (!result.success) {
        console.error(
          '[useAuth] Đăng xuất thất bại:',
          result.error,
        );
      }

      // Luôn xoá trạng thái cục bộ bất kể API trả về gì
      clearAuth();

      return {
        data: null,
        error: result.success ? null : (result.error ?? 'Đăng xuất thất bại.'),
        success: result.success,
      };
    } catch (err) {
      const message =
        (err as Error)?.message ??
        'Đã xảy ra lỗi không xác định khi đăng xuất.';
      clearAuth();
      return { data: null, error: message, success: false as const };
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearAuth]);

  // -----------------------------------------------------------------------
  // Đặt lại mật khẩu
  // -----------------------------------------------------------------------

  const resetPassword = useCallback(async (email: string) => {
    try {
      const result = await authService.resetPassword(email);

      if (!result.success) {
        return {
          data: null,
          error:
            result.error ??
            'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.',
          success: false as const,
        };
      }

      return {
        data: null,
        error: null,
        success: true as const,
      };
    } catch (err) {
      const message =
        (err as Error)?.message ??
        'Đã xảy ra lỗi không xác định khi đặt lại mật khẩu.';
      return { data: null, error: message, success: false as const };
    }
  }, []);

  // -----------------------------------------------------------------------
  // Kiểm tra vai trò
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

  // -----------------------------------------------------------------------
  // Kiểm tra quyền theo hành động
  // -----------------------------------------------------------------------

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
  // Trả về
  // -----------------------------------------------------------------------

  return {
    // Trạng thái
    user,
    profile,
    session,
    isLoading,
    isAuthenticated,

    // Hành động xác thực
    signIn,
    signUp,
    signOut,
    resetPassword,

    // Phân quyền
    hasRole,
    hasPermission,
  };
}
