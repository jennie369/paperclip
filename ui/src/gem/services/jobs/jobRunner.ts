// ============================================================================
// Job Runner — Giám sát công việc qua Realtime
// GEM Content Control Center
//
// Đã refactor: Bỏ toàn bộ AI execution logic.
// Claude Code (local, Max plan) xử lý job qua Supabase MCP.
// Runner chỉ giám sát trạng thái, tạo thông báo, và gọi callbacks.
// ============================================================================

import { getSupabase } from '../api/supabase';
import type { CcGenerationJobsRow } from '@gem/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Cấu hình Job Runner */
export interface JobRunnerConfig {
  /** Callback khi công việc hoàn thành */
  readonly onJobComplete?: (job: CcGenerationJobsRow) => void;
  /** Callback khi công việc thất bại */
  readonly onJobFailed?: (job: CcGenerationJobsRow, error: string) => void;
  /** Callback khi có job mới được tạo */
  readonly onJobCreated?: (job: CcGenerationJobsRow) => void;
  /** Callback khi job bắt đầu xử lý */
  readonly onJobProcessing?: (job: CcGenerationJobsRow) => void;
}

/** Trạng thái nội bộ của runner */
interface RunnerState {
  isRunning: boolean;
  channel: RealtimeChannel | null;
  callbacks: Required<JobRunnerConfig>;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state: RunnerState = {
  isRunning: false,
  channel: null,
  callbacks: {
    onJobComplete: () => {},
    onJobFailed: () => {},
    onJobCreated: () => {},
    onJobProcessing: () => {},
  },
};

// ---------------------------------------------------------------------------
// Notification helper
// ---------------------------------------------------------------------------

async function createJobNotification(
  job: CcGenerationJobsRow,
  success: boolean,
  errorMessage?: string,
): Promise<void> {
  try {
    const supabase = getSupabase();
    const inputParams = job.input_params as Record<string, unknown>;
    const label = ((job.metadata as Record<string, unknown>)?.label as string) ?? job.job_type;

    await supabase.from('cc_notifications').insert({
      user_id: job.created_by,
      title: success
        ? `${label} hoàn thành`
        : `${label} thất bại`,
      message: success
        ? `Công việc "${inputParams.topic ?? label}" đã hoàn thành thành công.`
        : `Công việc "${inputParams.topic ?? label}" thất bại: ${errorMessage ?? 'Lỗi không xác định.'}`,
      category: 'generation',
      severity: success ? 'info' : 'medium',
      entity_type: 'generation_job',
      entity_id: job.id,
      metadata: {},
    });
  } catch {
    // Bỏ qua lỗi khi tạo thông báo — không ảnh hưởng luồng chính
  }
}

// ---------------------------------------------------------------------------
// Realtime event handler
// ---------------------------------------------------------------------------

function handleJobUpdate(payload: { new: Record<string, unknown>; old: Record<string, unknown> }) {
  const updated = payload.new as unknown as CcGenerationJobsRow;
  const oldStatus = (payload.old as Record<string, unknown>)?.status as string | undefined;
  const newStatus = updated.status;

  // Chỉ xử lý khi status thay đổi
  if (oldStatus === newStatus) return;

  switch (newStatus) {
    case 'processing':
      state.callbacks.onJobProcessing(updated);
      break;

    case 'completed':
      state.callbacks.onJobComplete(updated);
      createJobNotification(updated, true).catch(() => {});
      break;

    case 'failed': {
      const errorMsg = updated.error_message ?? 'Lỗi không xác định.';
      state.callbacks.onJobFailed(updated, errorMsg);
      createJobNotification(updated, false, errorMsg).catch(() => {});
      break;
    }
  }
}

function handleJobInsert(payload: { new: Record<string, unknown> }) {
  const created = payload.new as unknown as CcGenerationJobsRow;
  state.callbacks.onJobCreated(created);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const jobRunner = {
  /**
   * Bắt đầu giám sát công việc qua Supabase Realtime.
   *
   * Subscribe vào cc_generation_jobs để nhận updates khi:
   * - Job mới được tạo (INSERT)
   * - Job thay đổi trạng thái (UPDATE)
   * Tự động tạo notifications khi completed/failed.
   */
  start(config: JobRunnerConfig = {}): void {
    if (state.isRunning) {
      return;
    }

    state.isRunning = true;
    state.callbacks = {
      onJobComplete: config.onJobComplete ?? (() => {}),
      onJobFailed: config.onJobFailed ?? (() => {}),
      onJobCreated: config.onJobCreated ?? (() => {}),
      onJobProcessing: config.onJobProcessing ?? (() => {}),
    };

    const supabase = getSupabase();

    state.channel = supabase
      .channel('job-runner-monitor')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cc_generation_jobs',
        },
        handleJobUpdate,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cc_generation_jobs',
        },
        handleJobInsert,
      )
      .subscribe();
  },

  /**
   * Dừng giám sát công việc.
   */
  stop(): void {
    state.isRunning = false;

    if (state.channel) {
      state.channel.unsubscribe();
      state.channel = null;
    }
  },

  /**
   * Kiểm tra runner đang chạy hay không.
   */
  isRunning(): boolean {
    return state.isRunning;
  },

  /**
   * Lấy số công việc đang xử lý (query trực tiếp DB).
   */
  async getActiveCount(): Promise<number> {
    const supabase = getSupabase();
    const { count } = await supabase
      .from('cc_generation_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'processing');
    return count ?? 0;
  },

  /**
   * Lấy danh sách ID các công việc đang xử lý.
   */
  async getActiveJobIds(): Promise<string[]> {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('cc_generation_jobs')
      .select('id')
      .eq('status', 'processing');
    return (data ?? []).map((row) => (row as Record<string, unknown>).id as string);
  },
};
