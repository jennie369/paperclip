// ============================================================================
// Claude AI Service (Client-side) — Job Queue Bridge
// GEM Content Control Center
//
// Thay vì gọi Anthropic API trực tiếp, service này tạo job trong
// cc_generation_jobs và chờ kết quả qua Supabase Realtime.
// Claude Code (chạy local với Max plan) sẽ xử lý job.
// ============================================================================

import { getSupabase } from './supabase';
// Import Gemral's main Supabase client for auth (CC client is separate project)
import { supabase as gemralSupabase } from '../../../lib/supabaseClient';
import type { Json, ContentType, Track, Pillar, PersonaType, WritingMode } from '@gem/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClaudeGenerateParams {
  /** Prompt hệ thống mô tả vai trò và hướng dẫn cho Claude */
  systemPrompt: string;
  /** Prompt nội dung từ người dùng */
  userPrompt: string;
  /** Số token tối đa cho phản hồi (mặc định: 8192) */
  maxTokens?: number;
  /** Mức độ sáng tạo 0-1 (mặc định: 0.7) */
  temperature?: number;
  /** Mô hình AI cần sử dụng (không dùng trực tiếp — chỉ để metadata) */
  model?: string;
  /** AI provider: 'claude' (mặc định), 'gemini', hoặc 'openai' */
  provider?: 'claude' | 'gemini' | 'openai';
  /** Callback nhận từng đoạn text khi streaming — NO-OP qua job queue */
  onStream?: (chunk: string) => void;
  /** Callback theo dõi tiến trình (ước tính token đã dùng) */
  onProgress?: (info: { tokensUsed: number }) => void;
  /** AbortSignal để huỷ request đang chạy */
  signal?: AbortSignal;
  /** Thời gian chờ tối đa (ms, mặc định: 300000 = 5 phút) */
  timeoutMs?: number;
  /** User ID để tạo job (bắt buộc cho job queue) */
  userId?: string;
  /** Job type override (mặc định: 'script') */
  jobType?: string;
  /** Nguồn tạo job */
  source?: 'web_app' | 'edge_function' | 'batch' | 'interactive';
  /** Content type (LATC/TMT/short_clip) — batch processor dùng để chọn framework */
  contentType?: ContentType;
  /** Track (wealth/wellness/integration) */
  track?: Track;
  /** Pillar */
  pillar?: Pillar;
  /** Persona */
  persona?: PersonaType;
  /** Writing mode */
  writingMode?: WritingMode;
}

export interface ClaudeGenerateResult {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  /** Job ID trong cc_generation_jobs */
  jobId?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_TEMPERATURE = 0.7;
const POLL_INTERVAL_MS = 3000; // Polling fallback mỗi 3 giây

// Timeout theo job type (ms) — Claude CLI + knowledge files đọc lâu hơn Gemini
const JOB_TIMEOUT_MS: Record<string, number> = {
  script:       1800000, // 30 phút — kịch bản dài, Claude đọc nhiều knowledge files
  title:         600000, // 10 phút
  social_post:   900000, // 15 phút
  news:         1200000, // 20 phút — bài dài SEO
  email:         900000, // 15 phút
  image_prompt:  600000, // 10 phút
  analysis:      900000, // 15 phút
  repurpose:    1200000, // 20 phút
};
const DEFAULT_TIMEOUT_MS = 1800000; // 30 phút fallback

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const claudeService = {
  /**
   * Tạo nội dung bằng Claude AI qua job queue.
   *
   * Flow: Insert job → Subscribe Realtime → Chờ completed/failed → Return.
   * Claude Code (local) sẽ pick up job và xử lý.
   *
   * Lưu ý: `onStream` callback trở thành no-op vì streaming
   * không khả dụng qua job queue pattern.
   *
   * @throws Error khi job thất bại, timeout, hoặc bị huỷ
   */
  async generate(params: ClaudeGenerateParams): Promise<ClaudeGenerateResult> {
    const supabase = getSupabase();
    const model = params.model || DEFAULT_MODEL;
    const maxTokens = params.maxTokens ?? DEFAULT_MAX_TOKENS;
    const temperature = params.temperature ?? DEFAULT_TEMPERATURE;
    const jobType = params.jobType ?? 'script';
    const timeoutMs = params.timeoutMs ?? JOB_TIMEOUT_MS[jobType] ?? DEFAULT_TIMEOUT_MS;

    // Lấy user ID — thử Gemral auth trước, fallback về owner UUID
    // Paperclip dashboard là internal admin tool, không yêu cầu Gemral login
    const PAPERCLIP_OWNER_UUID = '01fe99b8-ef1b-4cdd-892a-3e976d6b1881';
    let userId = params.userId;
    if (!userId) {
      try {
        const { data: { user } } = await gemralSupabase.auth.getUser();
        userId = user?.id;
      } catch {
        // ignore auth errors — Paperclip doesn't require Gemral session
      }
    }
    if (!userId) {
      userId = PAPERCLIP_OWNER_UUID;
    }

    // 1. Tạo job trong cc_generation_jobs (RLS disabled — admin-only access)
    const insertData: Record<string, unknown> = {
      job_type: jobType,
      status: 'queued',
      priority: 'medium',
      input_params: {
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
        maxTokens,
        temperature,
        model,
        provider: params.provider ?? 'claude',
      } as unknown as Json,
      created_by: userId,
      track: params.track ?? null,
      pillar: params.pillar ?? null,
      persona: params.persona ?? null,
      writing_mode: params.writingMode ?? null,
      metadata: {
        label: 'Tạo nội dung AI',
        requested_model: model,
      } as unknown as Json,
    };
    if (params.contentType) {
      insertData.content_type = params.contentType;
    }

    const { data: job, error: insertError } = await supabase
      .from('cc_generation_jobs')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(insertData as any)
      .select()
      .single();

    if (insertError || !job) {
      throw new Error(
        `Không thể tạo công việc: ${insertError?.message ?? 'Lỗi không xác định.'}`
      );
    }

    const jobId = (job as Record<string, unknown>).id as string;

    // 2. Subscribe Realtime + polling fallback để chờ kết quả
    //    Realtime có thể không nhận được event (publication config, auth, cross-project)
    //    → polling mỗi POLL_INTERVAL_MS đảm bảo luôn detect được completion.
    return new Promise<ClaudeGenerateResult>((resolve, reject) => {
      let settled = false;
      let pollTimer: ReturnType<typeof setInterval> | null = null;

      // Helper: xử lý khi job hoàn thành (dùng chung cho Realtime + polling)
      const handleCompleted = (row: Record<string, unknown>) => {
        if (settled) return;
        settled = true;
        cleanup();

        const outputData = row.output_data as Record<string, unknown> | null;
        const content = (outputData?.content as string) ?? '';

        // Gọi onStream một lần với toàn bộ content (cho backward compat)
        params.onStream?.(content);

        const promptTokens = (row.prompt_tokens as number) ?? 0;
        const completionTokens = (row.completion_tokens as number) ?? 0;

        params.onProgress?.({
          tokensUsed: promptTokens + completionTokens,
        });

        resolve({
          content,
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: (row.total_tokens as number) ?? promptTokens + completionTokens,
          },
          model: (row.model_used as string) ?? model,
          jobId,
        });
      };

      // Helper: xử lý khi job thất bại
      const handleFailed = (row: Record<string, unknown>) => {
        if (settled) return;
        settled = true;
        cleanup();

        const errorMsg = (row.error_message as string) ?? 'Lỗi tạo nội dung.';
        reject(new Error(errorMsg));
      };

      // Cleanup tất cả timers và subscriptions
      const cleanup = () => {
        clearTimeout(timeoutTimer);
        if (pollTimer) clearInterval(pollTimer);
        params.signal?.removeEventListener('abort', onAbort);
        try { channel?.unsubscribe(); } catch { /* ignore */ }
      };

      // Timeout
      const timeoutTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Công việc tạo nội dung vượt quá ${Math.round(timeoutMs / 60000)} phút cho phép.`));
      }, timeoutMs);

      // Abort signal
      const onAbort = () => {
        if (settled) return;
        settled = true;
        cleanup();
        // Cancel job in DB
        supabase
          .from('cc_generation_jobs')
          .update({
            status: 'cancelled' as const,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
          .then(() => { });
        reject(new Error('Đã huỷ yêu cầu tạo nội dung.'));
      };
      params.signal?.addEventListener('abort', onAbort);

      // Realtime subscription (primary — instant if configured correctly)
      const channel = supabase
        .channel(`job-${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'cc_generation_jobs',
            filter: `id=eq.${jobId}`,
          },
          (payload) => {
            if (settled) return;

            const updated = payload.new as Record<string, unknown>;
            const status = updated.status as string;

            if (status === 'processing') {
              params.onProgress?.({ tokensUsed: 0 });
              return;
            }
            if (status === 'completed') {
              handleCompleted(updated);
            } else if (status === 'failed') {
              handleFailed(updated);
            }
          }
        )
        .subscribe();

      // Polling fallback (secondary — catches updates if Realtime misses them)
      let lastSeenStatus = 'queued';
      pollTimer = setInterval(async () => {
        if (settled) return;
        try {
          const { data, error } = await supabase
            .from('cc_generation_jobs')
            .select('status, output_data, error_message, prompt_tokens, completion_tokens, total_tokens, model_used, generation_time_ms')
            .eq('id', jobId)
            .single();

          if (error || !data) return;

          const row = data as Record<string, unknown>;
          const status = row.status as string;

          // Fire onProgress when status changes to processing
          if (status === 'processing' && lastSeenStatus !== 'processing') {
            lastSeenStatus = 'processing';
            params.onProgress?.({ tokensUsed: 0 });
          }

          if (status === 'completed') {
            handleCompleted(row);
          } else if (status === 'failed') {
            handleFailed(row);
          } else if (status === 'cancelled') {
            if (!settled) {
              settled = true;
              cleanup();
              reject(new Error('Công việc đã bị hủy.'));
            }
          }
        } catch {
          // Ignore polling errors — will retry next interval
        }
      }, POLL_INTERVAL_MS);
    });
  },

  /**
   * Tạo AbortController để huỷ request đang chạy.
   */
  createAbortController(): AbortController {
    return new AbortController();
  },
};
