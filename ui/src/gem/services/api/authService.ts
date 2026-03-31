// ============================================================================
// Authentication Service
// GEM Content Control Center
// ============================================================================

import type { AuthChangeEvent, Session, Subscription } from "@supabase/supabase-js";
import type {
  Profile,
  ProfileUpdate,
  ServiceResponse,
  SignUpParams,
} from "@gem/types";
import { getSupabase } from "./supabase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function client() {
  return getSupabase();
}

function serviceError<T>(message: string): ServiceResponse<T> {
  return { data: null, error: message, success: false };
}

function serviceOk<T>(data: T): ServiceResponse<T> {
  return { data, error: null, success: true };
}

// ---------------------------------------------------------------------------
// Sign Up
// ---------------------------------------------------------------------------

/**
 * Tạo tài khoản mới và profile tương ứng.
 *
 * Sau khi `auth.signUp` thành công, một bản ghi `profiles` được tạo
 * với `full_name` được cung cấp.
 */
export async function signUp(
  params: SignUpParams
): Promise<ServiceResponse<Session>> {
  try {
    const { email, password, fullName } = params;

    const { data: authData, error: authError } =
      await client()?.auth?.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      }) ?? { data: null, error: null };

    if (authError) {
      return serviceError(
        authError?.message ?? "Đăng ký thất bại. Vui lòng thử lại."
      );
    }

    const session = authData?.session ?? null;
    const userId = authData?.user?.id ?? null;

    if (!userId) {
      return serviceError(
        "Không thể xác định người dùng sau khi đăng ký. Vui lòng kiểm tra email xác nhận."
      );
    }

    // Create matching profile row
    const { error: profileError } = await client()
      ?.from("profiles")
      ?.upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          role: "viewer" as const,
          avatar_url: null,
          preferences: null,
        },
        { onConflict: "id" }
      ) ?? { error: null };

    if (profileError) {
      console.error(
        "[authService.signUp] Không thể tạo profile:",
        profileError?.message
      );
      // Non-blocking: the user was still created in auth.users
    }

    return serviceOk(session as Session);
  } catch (err: unknown) {
    const message =
      (err as Error)?.message ?? "Đã xảy ra lỗi không xác định khi đăng ký.";
    return serviceError(message);
  }
}

// ---------------------------------------------------------------------------
// Sign In
// ---------------------------------------------------------------------------

/**
 * Đăng nhập bằng email và mật khẩu.
 */
export async function signIn(
  email: string,
  password: string
): Promise<ServiceResponse<Session>> {
  try {
    const { data, error } =
      await client()?.auth?.signInWithPassword({
        email,
        password,
      }) ?? { data: null, error: null };

    if (error) {
      return serviceError(
        error?.message ?? "Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập."
      );
    }

    const session = data?.session ?? null;

    if (!session) {
      return serviceError(
        "Không nhận được phiên đăng nhập. Vui lòng thử lại."
      );
    }

    return serviceOk(session);
  } catch (err: unknown) {
    const message =
      (err as Error)?.message ?? "Đã xảy ra lỗi không xác định khi đăng nhập.";
    return serviceError(message);
  }
}

// ---------------------------------------------------------------------------
// Sign Out
// ---------------------------------------------------------------------------

/**
 * Đăng xuất và xoá phiên hiện tại.
 */
export async function signOut(): Promise<ServiceResponse<null>> {
  try {
    const { error } =
      await client()?.auth?.signOut() ?? { error: null };

    if (error) {
      return serviceError(
        error?.message ?? "Đăng xuất thất bại. Vui lòng thử lại."
      );
    }

    return serviceOk(null);
  } catch (err: unknown) {
    const message =
      (err as Error)?.message ?? "Đã xảy ra lỗi không xác định khi đăng xuất.";
    return serviceError(message);
  }
}

// ---------------------------------------------------------------------------
// Reset Password
// ---------------------------------------------------------------------------

/**
 * Gửi email đặt lại mật khẩu.
 */
export async function resetPassword(
  email: string
): Promise<ServiceResponse<null>> {
  try {
    const { error } =
      await client()?.auth?.resetPasswordForEmail(email) ?? { error: null };

    if (error) {
      return serviceError(
        error?.message ??
          "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại."
      );
    }

    return serviceOk(null);
  } catch (err: unknown) {
    const message =
      (err as Error)?.message ??
      "Đã xảy ra lỗi không xác định khi đặt lại mật khẩu.";
    return serviceError(message);
  }
}

// ---------------------------------------------------------------------------
// Get Session
// ---------------------------------------------------------------------------

/**
 * Lấy phiên đăng nhập hiện tại (nếu có).
 */
export async function getSession(): Promise<ServiceResponse<Session>> {
  try {
    const { data, error } =
      await client()?.auth?.getSession() ?? { data: null, error: null };

    if (error) {
      return serviceError(
        error?.message ?? "Không thể lấy phiên đăng nhập hiện tại."
      );
    }

    const session = data?.session ?? null;

    if (!session) {
      return serviceError("Chưa có phiên đăng nhập nào đang hoạt động.");
    }

    return serviceOk(session);
  } catch (err: unknown) {
    const message =
      (err as Error)?.message ??
      "Đã xảy ra lỗi không xác định khi lấy phiên đăng nhập.";
    return serviceError(message);
  }
}

// ---------------------------------------------------------------------------
// Get Profile
// ---------------------------------------------------------------------------

/**
 * Lấy profile của người dùng hiện tại từ bảng `profiles`.
 */
export async function getProfile(): Promise<ServiceResponse<Profile>> {
  try {
    const { data: userData, error: userError } =
      await client()?.auth?.getUser() ?? { data: null, error: null };

    if (userError) {
      return serviceError(
        userError?.message ?? "Không thể xác định người dùng hiện tại."
      );
    }

    const userId = userData?.user?.id ?? null;

    if (!userId) {
      return serviceError("Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");
    }

    const { data: profile, error: profileError } =
      await client()
        ?.from("profiles")
        ?.select("*")
        ?.eq("id", userId)
        ?.single() ?? { data: null, error: null };

    if (profileError) {
      return serviceError(
        profileError?.message ?? "Không thể tải thông tin hồ sơ người dùng."
      );
    }

    if (!profile) {
      return serviceError("Không tìm thấy hồ sơ người dùng.");
    }

    return serviceOk(profile as Profile);
  } catch (err: unknown) {
    const message =
      (err as Error)?.message ??
      "Đã xảy ra lỗi không xác định khi tải hồ sơ người dùng.";
    return serviceError(message);
  }
}

// ---------------------------------------------------------------------------
// Update Profile
// ---------------------------------------------------------------------------

/**
 * Cập nhật hồ sơ người dùng hiện tại.
 */
export async function updateProfile(
  updates: ProfileUpdate
): Promise<ServiceResponse<Profile>> {
  try {
    const { data: userData, error: userError } =
      await client()?.auth?.getUser() ?? { data: null, error: null };

    if (userError) {
      return serviceError(
        userError?.message ?? "Không thể xác định người dùng hiện tại."
      );
    }

    const userId = userData?.user?.id ?? null;

    if (!userId) {
      return serviceError("Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");
    }

    const { data: profile, error: profileError } =
      await client()
        ?.from("profiles")
        ?.update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        ?.eq("id", userId)
        ?.select("*")
        ?.single() ?? { data: null, error: null };

    if (profileError) {
      return serviceError(
        profileError?.message ?? "Không thể cập nhật hồ sơ người dùng."
      );
    }

    if (!profile) {
      return serviceError(
        "Cập nhật thành công nhưng không thể tải lại hồ sơ."
      );
    }

    return serviceOk(profile as Profile);
  } catch (err: unknown) {
    const message =
      (err as Error)?.message ??
      "Đã xảy ra lỗi không xác định khi cập nhật hồ sơ.";
    return serviceError(message);
  }
}

// ---------------------------------------------------------------------------
// Auth State Change
// ---------------------------------------------------------------------------

/**
 * Đăng ký lắng nghe thay đổi trạng thái xác thực.
 *
 * Trả về `Subscription` để có thể hủy khi component unmount.
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): Subscription | null {
  try {
    const { data } =
      client()?.auth?.onAuthStateChange((event, session) => {
        callback?.(event, session ?? null);
      }) ?? { data: null };

    return data?.subscription ?? null;
  } catch {
    console.error(
      "[authService.onAuthStateChange] Không thể đăng ký lắng nghe trạng thái xác thực."
    );
    return null;
  }
}
