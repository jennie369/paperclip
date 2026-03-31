// ============================================================================
// Job Queue Manager
// GEM Content Control Center
//
// Quản lý hàng đợi công việc tạo nội dung nền.
// Hỗ trợ tạo, theo dõi, huỷ, và cập nhật tiến trình công việc.
// Sử dụng bảng cc_generation_jobs trên Supabase.
// ============================================================================

import { getSupabase } from '../api/supabase';
import type {
  CcGenerationJobsRow,
  CcGenerationJobsInsert,
  CcGenerationJobsUpdate,
  GenerationJobStatus,
  Json,
} from '@gem/types';
import type { ServiceResponse } from '@gem/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Các loại công việc được hỗ trợ trong hệ thống */
export type JobType =
  | 'script'
  | 'title'
  | 'social_post'
  | 'image_prompt'
  | 'short_clip'
  | 'repurpose'
  | 'analytics'
  | 'video_process';

/** Tham số đầu vào khi thêm công việc mới */
export interface AddJobParams {
  readonly type: JobType;
  readonly params: Record<string, unknown>;
  readonly userId: string;
  readonly priority?: 'low' | 'medium' | 'high' | 'urgent';
  readonly contentType?: string;
  readonly track?: string;
  readonly pillar?: string;
  readonly persona?: string;
  readonly writingMode?: string;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly maxRetries?: number;
}

/** Bộ lọc danh sách công việc */
export interface JobListFilter {
  readonly status?: GenerationJobStatus | GenerationJobStatus[];
  readonly jobType?: JobType;
  readonly limit?: number;
  readonly offset?: number;
}

/** Kết quả phân trang danh sách công việc */
export interface JobListResult {
  readonly jobs: CcGenerationJobsRow[];
  readonly total: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serviceError<T>(message: string): ServiceResponse<T> {
  return { data: null, error: message, success: false };
}

function serviceOk<T>(data: T): ServiceResponse<T> {
  return { data, error: null, success: true };
}

// ---------------------------------------------------------------------------
// Nhãn tiếng Việt cho loại công việc
// ---------------------------------------------------------------------------

const JOB_TYPE_LABELS: Readonly<Record<JobType, string>> = {
  script: 'Tạo kịch bản',
  title: 'Tạo tiêu đề',
  social_post: 'Tạo bài đăng mạng xã hội',
  image_prompt: 'Tạo prompt hình ảnh',
  short_clip: 'Tạo kịch bản clip ngắn',
  repurpose: 'Tái sử dụng nội dung',
  analytics: 'Phân tích dữ liệu',
  video_process: 'Xử lý video',
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const jobQueue = {
  /**
   * Thêm công việc mới vào hàng đợi.
   *
   * Tạo bản ghi cc_generation_jobs với trạng thái 'queued'.
   * Trả về bản ghi công việc vừa tạo.
   */
  async addJob(params: AddJobParams): Promise<ServiceResponse<CcGenerationJobsRow>> {
    try {
      const supabase = getSupabase();

      // Map JobType sang job_type của database
      const jobTypeMap: Record<JobType, CcGenerationJobsInsert['job_type']> = {
        script: 'script',
        title: 'title',
        social_post: 'social_post',
        image_prompt: 'image_prompt',
        short_clip: 'script',
        repurpose: 'script',
        analytics: 'analysis',
        video_process: 'script',
      };

      const insert: CcGenerationJobsInsert = {
        job_type: jobTypeMap[params.type],
        status: 'queued',
        priority: params.priority ?? 'medium',
        input_params: {
          ...params.params,
          _job_subtype: params.type,
        } as unknown as Json,
        created_by: params.userId,
        content_type: (params.contentType as CcGenerationJobsInsert['content_type']) ?? null,
        track: (params.track as CcGenerationJobsInsert['track']) ?? null,
        pillar: (params.pillar as CcGenerationJobsInsert['pillar']) ?? null,
        persona: (params.persona as CcGenerationJobsInsert['persona']) ?? null,
        writing_mode: (params.writingMode as CcGenerationJobsInsert['writing_mode']) ?? null,
        entity_type: (params.entityType as CcGenerationJobsInsert['entity_type']) ?? null,
        entity_id: params.entityId ?? null,
        max_retries: params.maxRetries ?? 3,
        retry_count: 0,
        metadata: { label: JOB_TYPE_LABELS[params.type] } as unknown as Json,
      };

      const { data, error } = await supabase
        .from('cc_generation_jobs')
        .insert(insert)
        .select()
        .single();

      if (error) {
        return serviceError(error.message);
      }

      return serviceOk(data as CcGenerationJobsRow);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi thêm công việc vào hàng đợi.';
      return serviceError(message);
    }
  },

  /**
   * Lấy danh sách công việc đang hoạt động (queued/processing) của người dùng.
   */
  async getActiveJobs(userId: string): Promise<ServiceResponse<CcGenerationJobsRow[]>> {
    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('cc_generation_jobs')
        .select('*')
        .eq('created_by', userId)
        .in('status', ['queued', 'processing'])
        .order('created_at', { ascending: true });

      if (error) {
        return serviceError(error.message);
      }

      return serviceOk((data ?? []) as CcGenerationJobsRow[]);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Lỗi tải danh sách công việc đang hoạt động.';
      return serviceError(message);
    }
  },

  /**
   * Huỷ một công việc đang chờ hoặc đang xử lý.
   *
   * Chỉ huỷ được công việc có trạng thái 'queued' hoặc 'processing'.
   */
  async cancelJob(jobId: string): Promise<ServiceResponse<CcGenerationJobsRow>> {
    try {
      const supabase = getSupabase();

      // Kiểm tra trạng thái hiện tại
      const { data: current, error: fetchErr } = await supabase
        .from('cc_generation_jobs')
        .select('status')
        .eq('id', jobId)
        .single();

      if (fetchErr) {
        return serviceError(fetchErr.message);
      }

      const currentStatus = (current as Record<string, unknown>)?.status as string;
      if (currentStatus !== 'queued' && currentStatus !== 'processing') {
        return serviceError(
          `Không thể huỷ công việc có trạng thái "${currentStatus}". Chỉ huỷ được công việc đang chờ hoặc đang xử lý.`
        );
      }

      const updates: CcGenerationJobsUpdate = {
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('cc_generation_jobs')
        .update(updates)
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        return serviceError(error.message);
      }

      return serviceOk(data as CcGenerationJobsRow);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi huỷ công việc.';
      return serviceError(message);
    }
  },

  /**
   * Cập nhật tiến trình và trạng thái của công việc.
   *
   * @param jobId - ID công việc
   * @param progress - Phần trăm hoàn thành (0-100)
   * @param status - Trạng thái mới (tuỳ chọn)
   */
  async updateProgress(
    jobId: string,
    progress: number,
    status?: GenerationJobStatus,
  ): Promise<ServiceResponse<CcGenerationJobsRow>> {
    try {
      const supabase = getSupabase();

      const clampedProgress = Math.max(0, Math.min(100, progress));

      const updates: CcGenerationJobsUpdate = {
        metadata: { progress: clampedProgress } as unknown as Json,
        updated_at: new Date().toISOString(),
        ...(status ? { status } : {}),
      };

      // Đánh dấu thời gian bắt đầu nếu chuyển sang processing
      if (status === 'processing') {
        (updates as Record<string, unknown>).started_at = new Date().toISOString();
      }

      // Đánh dấu thời gian hoàn thành nếu kết thúc
      if (status === 'completed' || status === 'failed') {
        (updates as Record<string, unknown>).completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('cc_generation_jobs')
        .update(updates)
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        return serviceError(error.message);
      }

      return serviceOk(data as CcGenerationJobsRow);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi cập nhật tiến trình công việc.';
      return serviceError(message);
    }
  },

  /**
   * Lấy công việc cũ nhất đang chờ trong hàng đợi.
   *
   * Ưu tiên theo priority (urgent > high > medium > low),
   * sau đó theo thời gian tạo (cũ nhất trước).
   */
  async getNextQueued(): Promise<ServiceResponse<CcGenerationJobsRow | null>> {
    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('cc_generation_jobs')
        .select('*')
        .eq('status', 'queued')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        return serviceError(error.message);
      }

      return serviceOk(data as CcGenerationJobsRow | null);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Lỗi lấy công việc tiếp theo trong hàng đợi.';
      return serviceError(message);
    }
  },

  /**
   * Lấy danh sách công việc theo bộ lọc.
   */
  async listJobs(
    userId: string,
    filter: JobListFilter = {},
  ): Promise<ServiceResponse<JobListResult>> {
    try {
      const supabase = getSupabase();
      const limit = filter.limit ?? 20;
      const offset = filter.offset ?? 0;

      let query = supabase
        .from('cc_generation_jobs')
        .select('*', { count: 'exact' })
        .eq('created_by', userId);

      if (filter.status) {
        if (Array.isArray(filter.status)) {
          query = query.in('status', filter.status);
        } else {
          query = query.eq('status', filter.status);
        }
      }

      if (filter.jobType) {
        query = query.eq('job_type', filter.jobType as CcGenerationJobsRow['job_type']);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return serviceError(error.message);
      }

      return serviceOk({
        jobs: (data ?? []) as CcGenerationJobsRow[],
        total: count ?? 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi tải danh sách công việc.';
      return serviceError(message);
    }
  },

  /**
   * Đếm số công việc đang xử lý (processing).
   */
  async getProcessingCount(): Promise<ServiceResponse<number>> {
    try {
      const supabase = getSupabase();

      const { count, error } = await supabase
        .from('cc_generation_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'processing');

      if (error) {
        return serviceError(error.message);
      }

      return serviceOk(count ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi đếm công việc đang xử lý.';
      return serviceError(message);
    }
  },

  /**
   * Lấy nhãn tiếng Việt cho loại công việc.
   */
  getJobTypeLabel(type: JobType): string {
    return JOB_TYPE_LABELS[type] ?? type;
  },
};
