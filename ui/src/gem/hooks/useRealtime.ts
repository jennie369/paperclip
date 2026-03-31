'use client';

// ============================================================================
// useRealtime — Hook theo dõi thay đổi dữ liệu thời gian thực
// GEM Content Control Center
//
// Đăng ký lắng nghe thay đổi trên bảng Supabase qua Realtime
// (INSERT, UPDATE, DELETE). Tự động hủy đăng ký khi component unmount.
// ============================================================================

import { useEffect, useRef } from 'react';
import { getSupabase } from '@gem/services';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Kiểu dữ liệu
// ---------------------------------------------------------------------------

/** Sự kiện thay đổi từ Postgres */
type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

/** Payload trả về từ Realtime */
type RealtimePayload<T extends Record<string, unknown> = Record<string, unknown>> =
  RealtimePostgresChangesPayload<T>;

/** Callback xử lý sự kiện Realtime */
type RealtimeCallback<T extends Record<string, unknown> = Record<string, unknown>> =
  (payload: RealtimePayload<T>) => void;

/** Tuỳ chọn cấu hình cho useRealtime */
export interface UseRealtimeOptions<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Tên bảng cần theo dõi */
  table: string;
  /** Bộ lọc (ví dụ: "user_id=eq.abc123") */
  filter?: string;
  /** Callback xử lý khi có thay đổi */
  callback: RealtimeCallback<T>;
  /** Các sự kiện cần theo dõi (mặc định: tất cả) */
  events?: PostgresChangeEvent[];
  /** Schema (mặc định: "public") */
  schema?: string;
  /** Có kích hoạt hay không (mặc định: true) */
  enabled?: boolean;
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Hook theo dõi thay đổi dữ liệu thời gian thực trên một bảng Supabase.
 *
 * @example
 * ```tsx
 * useRealtime({
 *   table: 'cc_scripts',
 *   filter: 'created_by=eq.user-id-here',
 *   callback: (payload) => {
 *     console.log('Thay đổi:', payload.eventType, payload.new);
 *   },
 * });
 * ```
 */
export function useRealtime<
  T extends Record<string, unknown> = Record<string, unknown>,
>({
  table,
  filter,
  callback,
  events = ['INSERT', 'UPDATE', 'DELETE'],
  schema = 'public',
  enabled = true,
}: UseRealtimeOptions<T>): void {
  // Giữ callback mới nhất để tránh re-subscribe khi callback thay đổi tham chiếu
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabase();

    // Tạo tên channel duy nhất để tránh xung đột
    const channelName = `realtime:${schema}:${table}${filter ? `:${filter}` : ''}`;

    let channel = supabase.channel(channelName);

    // Đăng ký theo dõi từng loại sự kiện được yêu cầu
    for (const event of events) {
      const channelConfig: {
        event: PostgresChangeEvent;
        schema: string;
        table: string;
        filter?: string;
      } = {
        event,
        schema,
        table,
      };

      if (filter) {
        channelConfig.filter = filter;
      }

      channel = channel.on(
        'postgres_changes',
        channelConfig,
        (payload: RealtimePayload<T>) => {
          callbackRef.current(payload);
        },
      );
    }

    // Bắt đầu lắng nghe
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error(
          `[useRealtime] Lỗi kết nối kênh "${channelName}". Vui lòng kiểm tra cấu hình Realtime.`,
        );
      } else if (status === 'TIMED_OUT') {
        console.warn(
          `[useRealtime] Kết nối kênh "${channelName}" đã hết thời gian chờ.`,
        );
      }
    });

    // Dọn dẹp: hủy đăng ký khi unmount hoặc khi dependencies thay đổi
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, schema, enabled, events]);
}
