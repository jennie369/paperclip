// ============================================================================
// Scheduler Service — Tác vụ theo lịch trình
// GEM Content Control Center
//
// Quản lý các tác vụ định kỳ:
// - Nhắc nhở trước sự kiện lịch
// - Dọn dẹp dữ liệu hàng ngày
// - Phân tích hiệu suất hàng tuần
// Sử dụng setTimeout/setInterval cho client-side,
// và gọi Supabase Edge Functions cho server-side.
// ============================================================================

import { getSupabase } from '../api/supabase';
import type { ServiceResponse } from '@gem/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Một tác vụ đã được lên lịch */
export interface ScheduledTask {
  readonly id: string;
  readonly type: 'reminder' | 'cleanup' | 'weekly_analysis' | 'custom';
  readonly label: string;
  readonly scheduledAt: Date;
  readonly timerId: ReturnType<typeof setTimeout>;
}

/** Tham số nhắc nhở sự kiện */
export interface ReminderParams {
  readonly eventId: string;
  readonly eventTitle: string;
  readonly scheduledAt: Date;
  /** Số phút nhắc nhở trước sự kiện (mặc định: 30) */
  readonly minutesBefore?: number;
  readonly userId: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Lưu trữ các tác vụ đang chờ */
const activeTasks: Map<string, ScheduledTask> = new Map();

/** ID cho tác vụ tự động tăng */
let taskIdCounter = 0;

/** Timer cho tác vụ dọn dẹp hàng ngày */
let dailyCleanupTimerId: ReturnType<typeof setInterval> | null = null;

/** Timer cho tác vụ phân tích hàng tuần */
let weeklyAnalysisTimerId: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTaskId(): string {
  taskIdCounter += 1;
  return `task_${Date.now()}_${taskIdCounter}`;
}

function serviceError<T>(message: string): ServiceResponse<T> {
  return { data: null, error: message, success: false };
}

function serviceOk<T>(data: T): ServiceResponse<T> {
  return { data, error: null, success: true };
}

// ---------------------------------------------------------------------------
// Notification helper
// ---------------------------------------------------------------------------

async function createReminderNotification(
  userId: string,
  eventTitle: string,
  eventId: string,
  minutesBefore: number,
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('cc_notifications').insert({
      user_id: userId,
      title: 'Nhắc nhở sự kiện',
      message: `Sự kiện "${eventTitle}" sẽ bắt đầu trong ${minutesBefore} phút nữa.`,
      category: 'calendar',
      severity: 'info',
      entity_type: 'calendar_event',
      entity_id: eventId,
      action_label: 'Xem sự kiện',
      action_url: `/calendar?event=${eventId}`,
      metadata: {},
    });
  } catch {
    // Bỏ qua lỗi tạo thông báo
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const schedulerService = {
  /**
   * Lên lịch nhắc nhở trước sự kiện.
   *
   * Tạo setTimeout để gửi thông báo trước sự kiện
   * theo số phút được chỉ định (mặc định: 30 phút).
   *
   * Nếu thời điểm nhắc nhở đã qua, gửi thông báo ngay lập tức.
   */
  scheduleReminder(params: ReminderParams): ServiceResponse<ScheduledTask> {
    try {
      const minutesBefore = params.minutesBefore ?? 30;
      const reminderTime = new Date(
        params.scheduledAt.getTime() - minutesBefore * 60 * 1000,
      );
      const now = new Date();
      const delayMs = Math.max(0, reminderTime.getTime() - now.getTime());

      const taskId = generateTaskId();

      const timerId = setTimeout(async () => {
        await createReminderNotification(
          params.userId,
          params.eventTitle,
          params.eventId,
          minutesBefore,
        );
        activeTasks.delete(taskId);
      }, delayMs);

      const task: ScheduledTask = {
        id: taskId,
        type: 'reminder',
        label: `Nhắc nhở: ${params.eventTitle} (${minutesBefore} phút trước)`,
        scheduledAt: reminderTime,
        timerId,
      };

      activeTasks.set(taskId, task);
      return serviceOk(task);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi lên lịch nhắc nhở.';
      return serviceError(message);
    }
  },

  /**
   * Bắt đầu tác vụ dọn dẹp dữ liệu hàng ngày.
   *
   * Gọi hàm SQL `run_daily_cleanup` trên Supabase
   * mỗi 24 giờ. Tác vụ bao gồm:
   * - Xoá thông báo quá 30 ngày
   * - Xoá công việc thất bại quá 7 ngày
   * - Xoá nhật ký hoạt động quá 90 ngày
   */
  scheduleDailyCleanup(): ServiceResponse<string> {
    try {
      if (dailyCleanupTimerId !== null) {
        return serviceOk('Tác vụ dọn dẹp hàng ngày đã được lên lịch trước đó.');
      }

      const runCleanup = async (): Promise<void> => {
        try {
          const supabase = getSupabase();

          // Gọi hàm SQL dọn dẹp
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.rpc as any)('run_daily_cleanup');

          // Tạo thông báo hệ thống
          const { data: session } = await supabase.auth.getSession();
          const userId = session?.session?.user?.id;

          if (userId) {
            await supabase.from('cc_notifications').insert({
              user_id: userId,
              title: 'Dọn dẹp hệ thống',
              message: 'Tác vụ dọn dẹp dữ liệu hàng ngày đã hoàn thành.',
              category: 'system',
              severity: 'info',
              metadata: { type: 'daily_cleanup', timestamp: new Date().toISOString() },
            });
          }
        } catch {
          // Ghi log lỗi nhưng không dừng lịch trình
        }
      };

      // Chạy lần đầu
      runCleanup();

      // Lặp lại mỗi 24 giờ
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      dailyCleanupTimerId = setInterval(runCleanup, TWENTY_FOUR_HOURS_MS);

      return serviceOk('Đã lên lịch dọn dẹp hàng ngày.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi lên lịch dọn dẹp hàng ngày.';
      return serviceError(message);
    }
  },

  /**
   * Bắt đầu tác vụ phân tích hiệu suất hàng tuần.
   *
   * Kích hoạt analyticsAI mỗi 7 ngày để tạo báo cáo
   * phân tích YouTube và tạo thông báo khi hoàn thành.
   */
  scheduleWeeklyAnalysis(): ServiceResponse<string> {
    try {
      if (weeklyAnalysisTimerId !== null) {
        return serviceOk('Tác vụ phân tích hàng tuần đã được lên lịch trước đó.');
      }

      const runWeeklyAnalysis = async (): Promise<void> => {
        try {
          // Gọi Edge Function cho phân tích hàng tuần
          const supabase = getSupabase();
          await supabase.functions.invoke('weekly-report', {
            body: {
              trigger: 'scheduled',
              timestamp: new Date().toISOString(),
            },
          });
        } catch {
          // Ghi log lỗi nhưng không dừng lịch trình
        }
      };

      // Lặp lại mỗi 7 ngày
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      weeklyAnalysisTimerId = setInterval(runWeeklyAnalysis, SEVEN_DAYS_MS);

      return serviceOk('Đã lên lịch phân tích hàng tuần.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi lên lịch phân tích hàng tuần.';
      return serviceError(message);
    }
  },

  /**
   * Huỷ một tác vụ đã lên lịch.
   */
  cancelTask(taskId: string): ServiceResponse<null> {
    const task = activeTasks.get(taskId);
    if (!task) {
      return serviceError(`Không tìm thấy tác vụ với ID "${taskId}".`);
    }

    clearTimeout(task.timerId);
    activeTasks.delete(taskId);
    return serviceOk(null);
  },

  /**
   * Huỷ tất cả tác vụ đã lên lịch và dừng lịch trình định kỳ.
   */
  cancelAll(): void {
    // Huỷ tất cả nhắc nhở
    for (const [id, task] of activeTasks.entries()) {
      clearTimeout(task.timerId);
      activeTasks.delete(id);
    }

    // Dừng dọn dẹp hàng ngày
    if (dailyCleanupTimerId !== null) {
      clearInterval(dailyCleanupTimerId);
      dailyCleanupTimerId = null;
    }

    // Dừng phân tích hàng tuần
    if (weeklyAnalysisTimerId !== null) {
      clearInterval(weeklyAnalysisTimerId);
      weeklyAnalysisTimerId = null;
    }
  },

  /**
   * Lấy danh sách tất cả tác vụ đang chờ.
   */
  getActiveTasks(): ScheduledTask[] {
    return Array.from(activeTasks.values());
  },

  /**
   * Lấy số lượng tác vụ đang chờ.
   */
  getActiveTaskCount(): number {
    return activeTasks.size;
  },
};
