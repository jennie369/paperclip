import { aC as getSupabase } from './index-CvPgjxWl.js';

const generationJobService = {
  /** Create a new generation job */
  async create(job) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_generation_jobs").insert(job).select().single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tạo công việc";
      return { data: null, error: message, success: false };
    }
  },
  /** Get a job by ID */
  async getById(id) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_generation_jobs").select("*").eq("id", id).single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải công việc";
      return { data: null, error: message, success: false };
    }
  },
  /** Update job status + metadata */
  async update(id, updates) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_generation_jobs").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi cập nhật công việc";
      return { data: null, error: message, success: false };
    }
  },
  /** Mark job as processing */
  async markProcessing(id) {
    return this.update(id, {
      status: "processing",
      started_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  },
  /** Mark job as completed with output */
  async markCompleted(id, outputData, tokenUsage) {
    const updates = {
      status: "completed",
      output_data: outputData,
      completed_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (tokenUsage) {
      updates.prompt_tokens = tokenUsage.promptTokens;
      updates.completion_tokens = tokenUsage.completionTokens;
      updates.total_tokens = tokenUsage.totalTokens;
      updates.generation_time_ms = tokenUsage.generationTimeMs;
      updates.model_used = tokenUsage.modelUsed;
    }
    return this.update(id, updates);
  },
  /** Mark job as failed */
  async markFailed(id, errorMessage, errorCode) {
    return this.update(id, {
      status: "failed",
      error_message: errorMessage,
      error_code: errorCode ?? null,
      completed_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  },
  /** Cancel a job */
  async cancel(id) {
    return this.update(id, {
      status: "cancelled",
      completed_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  },
  /** Get recent jobs for a user */
  async listByUser(userId, limit = 20) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_generation_jobs").select("*").eq("created_by", userId).order("created_at", { ascending: false }).limit(limit);
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: data ?? [], error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải danh sách công việc";
      return { data: null, error: message, success: false };
    }
  },
  /** Create an iterate job (sửa script trong cùng session) */
  async createIterate(parentJobId, sessionId, instruction, userId) {
    try {
      const parentJob = await this.getById(parentJobId);
      if (!parentJob.success || !parentJob.data) {
        return { data: null, error: "Không tìm thấy job gốc", success: false };
      }
      const parent = parentJob.data;
      const inputParams = {
        ...parent.input_params,
        action: "iterate",
        session_id: sessionId,
        instruction,
        parent_job_id: parentJobId
      };
      return this.create({
        job_type: parent.job_type,
        input_params: inputParams,
        content_type: parent.content_type,
        track: parent.track,
        pillar: parent.pillar,
        persona: parent.persona,
        writing_mode: parent.writing_mode,
        created_by: userId,
        source: "web_iterate",
        metadata: { parent_job_id: parentJobId, session_id: sessionId }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tạo iterate job";
      return { data: null, error: message, success: false };
    }
  },
  /** Create a submit_final job (gửi bản final để AI học) */
  async createSubmitFinal(sessionId, draftBody, finalBody, userNotes, userId) {
    try {
      const inputParams = {
        action: "submit_final",
        session_id: sessionId,
        draft_body: draftBody.slice(0, 5e3),
        final_body: finalBody.slice(0, 5e3),
        user_notes: userNotes
      };
      return this.create({
        job_type: "analysis",
        input_params: inputParams,
        created_by: userId,
        source: "web_feedback",
        metadata: { session_id: sessionId, feedback: true }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tạo feedback job";
      return { data: null, error: message, success: false };
    }
  },
  /** Get active (queued/processing) jobs count */
  async getActiveCount(userId) {
    try {
      const supabase = getSupabase();
      const { count, error } = await supabase.from("cc_generation_jobs").select("id", { count: "exact", head: true }).eq("created_by", userId).in("status", ["queued", "processing"]);
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: count ?? 0, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi đếm công việc";
      return { data: null, error: message, success: false };
    }
  }
};

export { generationJobService };
