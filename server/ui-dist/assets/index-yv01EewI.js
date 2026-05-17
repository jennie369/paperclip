import { aC as getSupabase, d9 as TERM_CONVERSIONS, bx as claudeService, da as vietnameseNLP, db as brandVoiceChecker } from './index-Cxd0f6Om.js';
export { dc as getSupabaseAdmin, dd as useAppStore } from './index-Cxd0f6Om.js';
import { c as calendarService } from './calendarService-CPXe1EWE.js';
export { generationJobService } from './generationJobService-DTWrQm4M.js';
export { a as analyticsAI, y as youtubeService } from './youtubeService-BC7Ngfse.js';

function client$2() {
  return getSupabase();
}
function serviceError$5(message) {
  return { data: null, error: message, success: false };
}
function serviceOk$5(data) {
  return { data, error: null, success: true };
}
async function signUp(params) {
  try {
    const { email, password, fullName } = params;
    const { data: authData, error: authError } = await client$2()?.auth?.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    }) ?? { data: null, error: null };
    if (authError) {
      return serviceError$5(
        authError?.message ?? "Đăng ký thất bại. Vui lòng thử lại."
      );
    }
    const session = authData?.session ?? null;
    const userId = authData?.user?.id ?? null;
    if (!userId) {
      return serviceError$5(
        "Không thể xác định người dùng sau khi đăng ký. Vui lòng kiểm tra email xác nhận."
      );
    }
    const { error: profileError } = await client$2()?.from("profiles")?.upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role: "viewer",
        avatar_url: null,
        preferences: null
      },
      { onConflict: "id" }
    ) ?? { error: null };
    if (profileError) {
      console.error(
        "[authService.signUp] Không thể tạo profile:",
        profileError?.message
      );
    }
    return serviceOk$5(session);
  } catch (err) {
    const message = err?.message ?? "Đã xảy ra lỗi không xác định khi đăng ký.";
    return serviceError$5(message);
  }
}
async function signIn(email, password) {
  try {
    const { data, error } = await client$2()?.auth?.signInWithPassword({
      email,
      password
    }) ?? { data: null, error: null };
    if (error) {
      return serviceError$5(
        error?.message ?? "Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập."
      );
    }
    const session = data?.session ?? null;
    if (!session) {
      return serviceError$5(
        "Không nhận được phiên đăng nhập. Vui lòng thử lại."
      );
    }
    return serviceOk$5(session);
  } catch (err) {
    const message = err?.message ?? "Đã xảy ra lỗi không xác định khi đăng nhập.";
    return serviceError$5(message);
  }
}
async function signOut() {
  try {
    const { error } = await client$2()?.auth?.signOut() ?? { error: null };
    if (error) {
      return serviceError$5(
        error?.message ?? "Đăng xuất thất bại. Vui lòng thử lại."
      );
    }
    return serviceOk$5(null);
  } catch (err) {
    const message = err?.message ?? "Đã xảy ra lỗi không xác định khi đăng xuất.";
    return serviceError$5(message);
  }
}
async function resetPassword(email) {
  try {
    const { error } = await client$2()?.auth?.resetPasswordForEmail(email) ?? { error: null };
    if (error) {
      return serviceError$5(
        error?.message ?? "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại."
      );
    }
    return serviceOk$5(null);
  } catch (err) {
    const message = err?.message ?? "Đã xảy ra lỗi không xác định khi đặt lại mật khẩu.";
    return serviceError$5(message);
  }
}
async function getSession() {
  try {
    const { data, error } = await client$2()?.auth?.getSession() ?? { data: null, error: null };
    if (error) {
      return serviceError$5(
        error?.message ?? "Không thể lấy phiên đăng nhập hiện tại."
      );
    }
    const session = data?.session ?? null;
    if (!session) {
      return serviceError$5("Chưa có phiên đăng nhập nào đang hoạt động.");
    }
    return serviceOk$5(session);
  } catch (err) {
    const message = err?.message ?? "Đã xảy ra lỗi không xác định khi lấy phiên đăng nhập.";
    return serviceError$5(message);
  }
}
async function getProfile() {
  try {
    const { data: userData, error: userError } = await client$2()?.auth?.getUser() ?? { data: null, error: null };
    if (userError) {
      return serviceError$5(
        userError?.message ?? "Không thể xác định người dùng hiện tại."
      );
    }
    const userId = userData?.user?.id ?? null;
    if (!userId) {
      return serviceError$5("Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");
    }
    const { data: profile, error: profileError } = await client$2()?.from("profiles")?.select("*")?.eq("id", userId)?.single() ?? { data: null, error: null };
    if (profileError) {
      return serviceError$5(
        profileError?.message ?? "Không thể tải thông tin hồ sơ người dùng."
      );
    }
    if (!profile) {
      return serviceError$5("Không tìm thấy hồ sơ người dùng.");
    }
    return serviceOk$5(profile);
  } catch (err) {
    const message = err?.message ?? "Đã xảy ra lỗi không xác định khi tải hồ sơ người dùng.";
    return serviceError$5(message);
  }
}
async function updateProfile(updates) {
  try {
    const { data: userData, error: userError } = await client$2()?.auth?.getUser() ?? { data: null, error: null };
    if (userError) {
      return serviceError$5(
        userError?.message ?? "Không thể xác định người dùng hiện tại."
      );
    }
    const userId = userData?.user?.id ?? null;
    if (!userId) {
      return serviceError$5("Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");
    }
    const { data: profile, error: profileError } = await client$2()?.from("profiles")?.update({
      ...updates,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    })?.eq("id", userId)?.select("*")?.single() ?? { data: null, error: null };
    if (profileError) {
      return serviceError$5(
        profileError?.message ?? "Không thể cập nhật hồ sơ người dùng."
      );
    }
    if (!profile) {
      return serviceError$5(
        "Cập nhật thành công nhưng không thể tải lại hồ sơ."
      );
    }
    return serviceOk$5(profile);
  } catch (err) {
    const message = err?.message ?? "Đã xảy ra lỗi không xác định khi cập nhật hồ sơ.";
    return serviceError$5(message);
  }
}
function onAuthStateChange(callback) {
  try {
    const { data } = client$2()?.auth?.onAuthStateChange((event, session) => {
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

const authService = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  getProfile,
  getSession,
  onAuthStateChange,
  resetPassword,
  signIn,
  signOut,
  signUp,
  updateProfile
}, Symbol.toStringTag, { value: 'Module' }));

function client$1() {
  return getSupabase();
}
function serviceError$4(message) {
  return { data: null, error: message, success: false };
}
function serviceOk$4(data) {
  return { data, error: null, success: true };
}
async function create(notification) {
  try {
    const { data, error } = await client$1()?.from("cc_notifications")?.insert(notification)?.select("*")?.single() ?? { data: null, error: null };
    if (error) {
      return serviceError$4(
        error?.message ?? "Không thể tạo thông báo. Vui lòng thử lại."
      );
    }
    if (!data) {
      return serviceError$4("Tạo thông báo thành công nhưng không nhận được dữ liệu trả về.");
    }
    return serviceOk$4(data);
  } catch (err) {
    const message = err?.message ?? "Đã xảy ra lỗi không xác định khi tạo thông báo.";
    return serviceError$4(message);
  }
}
async function getUnread(userId) {
  try {
    const { data, error } = await client$1()?.from("cc_notifications")?.select("*")?.eq("user_id", userId)?.eq("is_read", false)?.order("created_at", { ascending: false }) ?? { data: null, error: null };
    if (error) {
      return serviceError$4(
        error?.message ?? "Không thể tải thông báo chưa đọc."
      );
    }
    return serviceOk$4(data ?? []);
  } catch (err) {
    const message = err?.message ?? "Đã xảy ra lỗi không xác định khi tải thông báo chưa đọc.";
    return serviceError$4(message);
  }
}
async function markAsRead(id) {
  try {
    const { data, error } = await client$1()?.from("cc_notifications")?.update({ is_read: true })?.eq("id", id)?.select("*")?.single() ?? { data: null, error: null };
    if (error) {
      return serviceError$4(
        error?.message ?? "Không thể đánh dấu thông báo đã đọc."
      );
    }
    if (!data) {
      return serviceError$4("Không tìm thấy thông báo cần cập nhật.");
    }
    return serviceOk$4(data);
  } catch (err) {
    const message = err?.message ?? "Đã xảy ra lỗi không xác định khi đánh dấu thông báo đã đọc.";
    return serviceError$4(message);
  }
}
async function markAllRead(userId) {
  try {
    const { error } = await client$1()?.from("cc_notifications")?.update({ is_read: true })?.eq("user_id", userId)?.eq("is_read", false) ?? { error: null };
    if (error) {
      return serviceError$4(
        error?.message ?? "Không thể đánh dấu tất cả thông báo là đã đọc."
      );
    }
    return serviceOk$4(null);
  } catch (err) {
    const message = err?.message ?? "Đã xảy ra lỗi không xác định khi đánh dấu tất cả thông báo đã đọc.";
    return serviceError$4(message);
  }
}
async function getCount(userId) {
  try {
    const { count, error } = await client$1()?.from("cc_notifications")?.select("id", { count: "exact", head: true })?.eq("user_id", userId)?.eq("is_read", false) ?? { count: null, error: null };
    if (error) {
      return serviceError$4(
        error?.message ?? "Không thể đếm số thông báo chưa đọc."
      );
    }
    return serviceOk$4(count ?? 0);
  } catch (err) {
    const message = err?.message ?? "Đã xảy ra lỗi không xác định khi đếm thông báo chưa đọc.";
    return serviceError$4(message);
  }
}

const notificationService = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  create,
  getCount,
  getUnread,
  markAllRead,
  markAsRead
}, Symbol.toStringTag, { value: 'Module' }));

function client() {
  return getSupabase();
}
function serviceError$3(message) {
  return { data: null, error: message, success: false };
}
function serviceOk$3(data) {
  return { data, error: null, success: true };
}
async function log(params) {
  try {
    const { data, error } = await client()?.from("cc_activity_log")?.insert({
      user_id: params?.user_id,
      action: params?.action,
      entity_type: params?.entity_type,
      entity_id: params?.entity_id ?? "",
      metadata: params?.metadata ?? {},
      ip_address: params?.ip_address ?? null
    })?.select("*")?.single() ?? { data: null, error: null };
    if (error) {
      return serviceError$3(
        error?.message ?? "Không thể ghi nhật ký hoạt động. Vui lòng thử lại."
      );
    }
    if (!data) {
      return serviceError$3(
        "Ghi nhật ký thành công nhưng không nhận được dữ liệu trả về."
      );
    }
    return serviceOk$3(data);
  } catch (err) {
    const message = err?.message ?? "Đã xảy ra lỗi không xác định khi ghi nhật ký hoạt động.";
    return serviceError$3(message);
  }
}

const activityService = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  log
}, Symbol.toStringTag, { value: 'Module' }));

const scriptService = {
  /** Fetch paginated, filtered script list */
  async list(params = {}) {
    try {
      const supabase = getSupabase();
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 20;
      const offset = (page - 1) * pageSize;
      let query = supabase.from("cc_scripts").select("*", { count: "exact" });
      if (params.contentType) query = query.eq("content_type", params.contentType);
      if (params.track) query = query.eq("track", params.track);
      if (params.pillar) query = query.eq("pillar", params.pillar);
      if (params.persona) query = query.eq("persona", params.persona);
      if (params.writingMode) query = query.eq("writing_mode", params.writingMode);
      if (params.status) query = query.eq("status", params.status);
      if (params.createdBy) query = query.eq("created_by", params.createdBy);
      if (params.search) query = query.ilike("title", `%${params.search}%`);
      const sortBy = params.sortBy ?? "created_at";
      const sortOrder = params.sortOrder ?? "desc";
      query = query.order(sortBy, { ascending: sortOrder === "asc" }).range(offset, offset + pageSize - 1);
      const { data, error, count } = await query;
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      const total = count ?? 0;
      return {
        data: {
          scripts: data ?? [],
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        },
        error: null,
        success: true
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải danh sách kịch bản";
      return { data: null, error: message, success: false };
    }
  },
  /** Get single script by ID */
  async getById(id) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_scripts").select("*").eq("id", id).single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải kịch bản";
      return { data: null, error: message, success: false };
    }
  },
  /** Create a new script */
  async create(script) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_scripts").insert(script).select().single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tạo kịch bản";
      return { data: null, error: message, success: false };
    }
  },
  /** Update an existing script.
   *  Uses maybeSingle() instead of single() — RLS policy `scripts_update` only
   *  permits the script's creator or owner/admin/manager roles. When neither
   *  is true (e.g. anonymous session), the UPDATE silently affects 0 rows and
   *  single() would surface a confusing 406 PGRST116 "Cannot coerce ... 0 rows"
   *  to the user. maybeSingle() returns data=null in that case, which we map
   *  to a clear permission error. */
  async update(id, updates) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_scripts").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().maybeSingle();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      if (!data) {
        return {
          data: null,
          error: "Không có quyền cập nhật kịch bản này (cần đăng nhập với tài khoản tạo script hoặc role owner/admin/manager)",
          success: false
        };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi cập nhật kịch bản";
      return { data: null, error: message, success: false };
    }
  },
  /** Delete a script (soft delete → set status to archived) */
  async archive(id) {
    return this.update(id, { status: "archived" });
  },
  /** Hard delete a script */
  async remove(id) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("cc_scripts").delete().eq("id", id);
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: null, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi xóa kịch bản";
      return { data: null, error: message, success: false };
    }
  },
  /** Update script status */
  async updateStatus(id, status, userId) {
    const updates = { status, updated_by: userId };
    if (status === "approved") {
      updates.approved_by = userId;
      updates.approved_at = (/* @__PURE__ */ new Date()).toISOString();
    }
    return this.update(id, updates);
  },
  /** Get dashboard stats */
  async getDashboardStats() {
    try {
      const supabase = getSupabase();
      const [totalRes, publishedRes, reviewRes, draftRes] = await Promise.all([
        supabase.from("cc_scripts").select("id", { count: "exact", head: true }),
        supabase.from("cc_scripts").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("cc_scripts").select("id", { count: "exact", head: true }).eq("status", "review"),
        supabase.from("cc_scripts").select("id", { count: "exact", head: true }).eq("status", "draft")
      ]);
      return {
        data: {
          totalScripts: totalRes.count ?? 0,
          publishedScripts: publishedRes.count ?? 0,
          pendingReview: reviewRes.count ?? 0,
          drafts: draftRes.count ?? 0
        },
        error: null,
        success: true
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải thống kê";
      return { data: null, error: message, success: false };
    }
  },
  /** Duplicate a script (creates new version) */
  async duplicate(id, userId) {
    const { data: original, error } = await this.getById(id);
    if (error || !original) {
      return { data: null, error: error ?? "Không tìm thấy kịch bản gốc", success: false };
    }
    const newScript = {
      title: `${original.title} (Bản sao)`,
      content_type: original.content_type,
      track: original.track,
      pillar: original.pillar,
      persona: original.persona,
      writing_mode: original.writing_mode,
      status: "draft",
      body: original.body,
      sections: original.sections,
      emotional_arc: original.emotional_arc,
      word_count: original.word_count,
      estimated_duration_seconds: original.estimated_duration_seconds,
      hook: original.hook,
      cta: original.cta,
      tags: original.tags,
      version: 1,
      parent_script_id: original.id,
      notes: `Bản sao từ "${original.title}"`,
      metadata: original.metadata,
      created_by: userId
    };
    return this.create(newScript);
  }
};

const titleService = {
  /** Get titles for a script */
  async getByScriptId(scriptId) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_titles").select("*").eq("script_id", scriptId).order("created_at", { ascending: false });
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: data ?? [], error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải tiêu đề";
      return { data: null, error: message, success: false };
    }
  },
  /** List all titles with optional filters */
  async list(params = {}) {
    try {
      const supabase = getSupabase();
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 20;
      const offset = (page - 1) * pageSize;
      let query = supabase.from("cc_titles").select("*", { count: "exact" });
      if (params.contentType) query = query.eq("content_type", params.contentType);
      if (params.search) query = query.ilike("title_text", `%${params.search}%`);
      query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);
      const { data, error, count } = await query;
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return {
        data: { titles: data ?? [], total: count ?? 0 },
        error: null,
        success: true
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải danh sách tiêu đề";
      return { data: null, error: message, success: false };
    }
  },
  /** Create a new title */
  async create(title) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_titles").insert(title).select().single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tạo tiêu đề";
      return { data: null, error: message, success: false };
    }
  },
  /** Create multiple titles at once */
  async createBatch(titles) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_titles").insert(titles).select();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: data ?? [], error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tạo tiêu đề hàng loạt";
      return { data: null, error: message, success: false };
    }
  },
  /** Update a title */
  async update(id, updates) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_titles").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi cập nhật tiêu đề";
      return { data: null, error: message, success: false };
    }
  },
  /** Select a title as the chosen one for a script */
  async selectTitle(id, scriptId) {
    try {
      const supabase = getSupabase();
      await supabase.from("cc_titles").update({ is_selected: false }).eq("script_id", scriptId);
      const { data, error } = await supabase.from("cc_titles").update({ is_selected: true, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi chọn tiêu đề";
      return { data: null, error: message, success: false };
    }
  },
  /** Delete a title */
  async remove(id) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("cc_titles").delete().eq("id", id);
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: null, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi xóa tiêu đề";
      return { data: null, error: message, success: false };
    }
  }
};

const socialPostService = {
  /** List posts with filters */
  async list(params = {}) {
    try {
      const supabase = getSupabase();
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 20;
      const offset = (page - 1) * pageSize;
      let query = supabase.from("cc_social_posts").select("*", { count: "exact" });
      if (params.platform) query = query.eq("platform", params.platform);
      if (params.status) query = query.eq("status", params.status);
      if (params.contentType) query = query.eq("content_type", params.contentType);
      if (params.scriptId) query = query.eq("script_id", params.scriptId);
      if (params.search) query = query.ilike("content", `%${params.search}%`);
      query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);
      const { data, error, count } = await query;
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return {
        data: { posts: data ?? [], total: count ?? 0 },
        error: null,
        success: true
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải bài đăng";
      return { data: null, error: message, success: false };
    }
  },
  /** Get single post */
  async getById(id) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_social_posts").select("*").eq("id", id).single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải bài đăng";
      return { data: null, error: message, success: false };
    }
  },
  /** Create a post */
  async create(post) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_social_posts").insert(post).select().single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tạo bài đăng";
      return { data: null, error: message, success: false };
    }
  },
  /** Create multiple posts (batch campaign) */
  async createBatch(posts) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_social_posts").insert(posts).select();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: data ?? [], error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tạo chiến dịch";
      return { data: null, error: message, success: false };
    }
  },
  /** Update a post */
  async update(id, updates) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_social_posts").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi cập nhật bài đăng";
      return { data: null, error: message, success: false };
    }
  },
  /** Schedule a post */
  async schedule(id, scheduledAt) {
    return this.update(id, { status: "scheduled", scheduled_at: scheduledAt });
  },
  /** Mark as published */
  async markPublished(id, externalPostId, externalUrl) {
    return this.update(id, {
      status: "published",
      published_at: (/* @__PURE__ */ new Date()).toISOString(),
      external_post_id: externalPostId ?? null,
      external_post_url: externalUrl ?? null
    });
  },
  /** Delete a post */
  async remove(id) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("cc_social_posts").delete().eq("id", id);
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: null, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi xóa bài đăng";
      return { data: null, error: message, success: false };
    }
  },
  /** Get posts for a campaign (grouped by date range) */
  async getCampaignPosts(startDate, endDate, platform) {
    try {
      const supabase = getSupabase();
      let query = supabase.from("cc_social_posts").select("*").gte("scheduled_at", startDate).lte("scheduled_at", endDate);
      if (platform) query = query.eq("platform", platform);
      query = query.order("scheduled_at", { ascending: true });
      const { data, error } = await query;
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: data ?? [], error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải chiến dịch";
      return { data: null, error: message, success: false };
    }
  }
};

const imagePromptService = {
  /** List image prompts */
  async list(params = {}) {
    try {
      const supabase = getSupabase();
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 20;
      const offset = (page - 1) * pageSize;
      let query = supabase.from("cc_image_prompts").select("*", { count: "exact" });
      if (params.status) query = query.eq("status", params.status);
      if (params.purpose) query = query.eq("purpose", params.purpose);
      query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);
      const { data, error, count } = await query;
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return {
        data: { prompts: data ?? [], total: count ?? 0 },
        error: null,
        success: true
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải prompt hình ảnh";
      return { data: null, error: message, success: false };
    }
  },
  /** Get by ID */
  async getById(id) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_image_prompts").select("*").eq("id", id).single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải prompt";
      return { data: null, error: message, success: false };
    }
  },
  /** Create image prompt */
  async create(prompt) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_image_prompts").insert(prompt).select().single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tạo prompt hình ảnh";
      return { data: null, error: message, success: false };
    }
  },
  /** Update image prompt */
  async update(id, updates) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_image_prompts").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi cập nhật prompt";
      return { data: null, error: message, success: false };
    }
  },
  /** Update status */
  async updateStatus(id, status) {
    return this.update(id, { status });
  },
  /** Select image from generated options */
  async selectImage(id, imageIndex) {
    return this.update(id, {
      selected_image_index: imageIndex,
      status: "approved"
    });
  },
  /** Delete prompt */
  async remove(id) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("cc_image_prompts").delete().eq("id", id);
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: null, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi xóa prompt";
      return { data: null, error: message, success: false };
    }
  },
  /** Get prompts for a script */
  async getByScriptId(scriptId) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_image_prompts").select("*").eq("script_id", scriptId).order("created_at", { ascending: false });
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: data ?? [], error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải prompt hình ảnh";
      return { data: null, error: message, success: false };
    }
  }
};

function ok(data) {
  return { data, error: null, success: true };
}
function err(message) {
  return { data: null, error: message, success: false };
}
const plannerService = {
  /**
   * Get all planner items for a date range
   */
  async getByDateRange(startDate, endDate) {
    try {
      const supabase = getSupabase();
      if (!supabase) return err("Supabase not initialized");
      const { data, error } = await supabase.from("cc_planner_items").select("*").gte("scheduled_date", startDate).lte("scheduled_date", endDate).order("scheduled_date", { ascending: true }).order("sort_order", { ascending: true });
      if (error) return err(error.message);
      return ok(data);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Lỗi tải planner");
    }
  },
  /**
   * Get all planner items (no date filter — for full sync)
   */
  async getAll() {
    try {
      const supabase = getSupabase();
      if (!supabase) return err("Supabase not initialized");
      const { data, error } = await supabase.from("cc_planner_items").select("*").order("scheduled_date", { ascending: true }).order("sort_order", { ascending: true });
      if (error) return err(error.message);
      return ok(data);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Lỗi tải planner");
    }
  },
  /**
   * Create a single planner item
   */
  async create(item) {
    try {
      const supabase = getSupabase();
      if (!supabase) return err("Supabase not initialized");
      const { data, error } = await supabase.from("cc_planner_items").insert(item).select().single();
      if (error) return err(error.message);
      return ok(data);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Lỗi tạo planner item");
    }
  },
  /**
   * Batch create (for imports)
   */
  async createMany(items) {
    try {
      const supabase = getSupabase();
      if (!supabase) return err("Supabase not initialized");
      const { data, error } = await supabase.from("cc_planner_items").insert(items).select();
      if (error) return err(error.message);
      return ok(data);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Lỗi import planner items");
    }
  },
  /**
   * Update a planner item
   */
  async update(id, updates) {
    try {
      const supabase = getSupabase();
      if (!supabase) return err("Supabase not initialized");
      const { data, error } = await supabase.from("cc_planner_items").update(updates).eq("id", id).select().single();
      if (error) return err(error.message);
      return ok(data);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Lỗi cập nhật planner item");
    }
  },
  /**
   * Delete a planner item
   */
  async remove(id) {
    try {
      const supabase = getSupabase();
      if (!supabase) return err("Supabase not initialized");
      const { error } = await supabase.from("cc_planner_items").delete().eq("id", id);
      if (error) return err(error.message);
      return ok(null);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Lỗi xóa planner item");
    }
  },
  /**
   * Delete all items for a date (used when replacing/clearing a day)
   */
  async removeByDate(date) {
    try {
      const supabase = getSupabase();
      if (!supabase) return err("Supabase not initialized");
      const { error } = await supabase.from("cc_planner_items").delete().eq("scheduled_date", date);
      if (error) return err(error.message);
      return ok(null);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Lỗi xóa planner items");
    }
  },
  /**
   * Subscribe to realtime changes on cc_planner_items.
   * Returns unsubscribe function.
   */
  subscribe(onChange) {
    const supabase = getSupabase();
    if (!supabase) return () => {
    };
    const channel = supabase.channel("cc_planner_items_changes").on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cc_planner_items" },
      (payload) => {
        onChange({
          eventType: payload.eventType,
          new: payload.new || null,
          old: payload.old || null
        });
      }
    ).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
  // ─── Conversion helpers ────────────────────────────────
  // Convert between flat DB rows and the { [date]: items[] } format used by the sidebar
  /**
   * Convert DB rows → plannerData object { "2026-03-10": [item, ...], ... }
   */
  rowsToMap(rows) {
    const map = {};
    for (const row of rows) {
      const date = row.scheduled_date;
      if (!map[date]) map[date] = [];
      map[date].push({
        id: row.id,
        time: row.time_slot || "",
        type: row.content_type || "other",
        title: row.title,
        brief: row.brief || "",
        source: row.source || "manual",
        status: row.status,
        scheduledContent: row.scheduled_content && Object.keys(row.scheduled_content).length > 0 ? row.scheduled_content : void 0
      });
    }
    return map;
  },
  /**
   * Convert a single sidebar item → DB insert payload
   */
  itemToRow(date, item) {
    return {
      scheduled_date: date,
      time_slot: item.time || "",
      content_type: item.type || "other",
      title: item.title,
      brief: item.brief || "",
      source: item.source || "manual",
      status: item.status || "planned",
      scheduled_content: item.scheduledContent || {}
    };
  }
};

const PERSONA_DESCRIPTIONS = {
  jennie_mentor: 'Jennie ở vai trò người dẫn đường, trầm tĩnh, chia sẻ kinh nghiệm thực chiến. Giọng nói ấm áp nhưng chắc chắn, như một người chị đã đi qua sóng gió và quay lại giúp bạn. Dùng ngôi "mình" hoặc "Jennie" khi kể trải nghiệm cá nhân.',
  jennie_provocateur: 'Jennie đanh thép, brutal honesty, pattern-interrupt, MODE 2 energy. Mở đầu bằng câu gây sốc hoặc sự thật trần trụi mà phần lớn không dám nói. Dùng ngôi "tôi" hoặc "Jennie" với sự tự tin cao.',
  jennie_storyteller: "Jennie kể chuyện cuốn hút, personal stories, emotional connection. Mỗi bài viết là một hành trình — có mở, thắt nút, cao trào, giải kết. Dùng chi tiết cảm giác, hình ảnh, và đoạn hội thoại nội tâm.",
  jennie_analyst: "Jennie phân tích dữ liệu, logic, evidence-based, trading focus. Trình bày rõ ràng theo từng lớp: data → insight → hành động. Sử dụng con số cụ thể, phần trăm, ví dụ chart thực.",
  jennie_motivator: "Jennie truyền cảm hứng, năng lượng cao, empowerment. Nâng tần số người nghe bằng affirmation mạnh mẽ, câu hỏi khai mở, và lời kêu gọi hành động ngay. Giọng rõ ràng, quyết đoán.",
  jennie_educator: "Jennie giải thích khái niệm phức tạp đơn giản, step-by-step. Đi từ cơ bản đến nâng cao, dùng ví dụ gần gũi đời thường. Đặt câu hỏi dẫn dắt để người nghe tự khám phá.",
  jennie_confidante: "Jennie thủ thỉ, intimate, healing, vulnerability. Chia sẻ những khoảnh khắc yếu đuối thật sự, nói chậm, nhẹ nhàng. Không phán xét, chỉ đồng hành. Tạo không gian an toàn cho người nghe."
};
const TRACK_DESCRIPTIONS = {
  wealth: "Tài Chính — Trading, LATC Money, chiến lược đầu tư, tư duy triệu phú. Tập trung vào: phân tích thị trường crypto, quản lý vốn, tâm lý giao dịch, và xây dựng tài sản bền vững.",
  wellness: "Tâm Thức — Thiền, tâm linh, chữa lành, nâng cao tần số. Tập trung vào: thiền định, năng lượng, nghiệp lực, chiêm tinh ý thức, và hành trình thức tỉnh cá nhân.",
  integration: "Tích Hợp — Lifestyle, cân bằng cuộc sống, ứng dụng thực tế. Tập trung vào: kết nối tài chính và tâm thức, sống có ý thức, ứng dụng spirituality vào đầu tư và ngược lại."
};
const PILLAR_DESCRIPTIONS = {
  spiritual: "Trụ cột Tâm Linh: năng lượng, tần số, thiền định, chữa lành, chiêm tinh.",
  trading: "Trụ cột Giao Dịch: phân tích kỹ thuật, chiến lược, quản lý rủi ro, tâm lý trading.",
  latc_money: "Trụ cột LATC Money: tài chính cá nhân, đầu tư dài hạn, xây dựng tài sản, tư duy tiền bạc.",
  lifestyle: "Trụ cột Lifestyle: cân bằng cuộc sống, thói quen, sức khỏe, mối quan hệ, phát triển bản thân."
};
const WRITING_MODE_DESCRIPTIONS = {
  mode_1_calm: "MODE 1 — CALM & AUTHORITATIVE\nGiọng trầm tĩnh, ấm áp, nuôi dưỡng. Như một người chị/cô/thầy chia sẻ bên tách trà.\nNhịp văn chậm, sâu, cho người nghe thời gian thẩm thấu.\nKhông gây sốc, không áp lực — chỉ dẫn dắt nhẹ nhàng nhưng chắc chắn.",
  mode_2_provocative: "MODE 2 — PROVOCATIVE & BOLD\nGiọng đanh thép, trực diện, pattern-interrupt. Sự thật trần trụi không đường bọc.\nNhịp văn nhanh, câu ngắn đan xen câu dài tạo tension.\nMở đầu bằng statement gây sốc hoặc câu hỏi đánh thẳng vào suy nghĩ thông thường."
};
function getGemFeatures() {
  return [
    "GEM Scanner — Thay vì ngồi canh chart 8 tiếng/ngày, bạn mở app lúc sáng và thấy 3-5 setup đã formed sẵn với entry/SL/TP rõ ràng. Cảm giác: kiểm soát, tự tin, có thời gian cho gia đình thay vì dán mắt màn hình.",
    'GEM Vision Board — Mỗi sáng mở app, bạn thấy mục tiêu 6 tháng cùng hình ảnh cụ thể kết quả mong muốn. Sau 3 tuần, bạn nhận ra não đã "khóa" vào đó và ra quyết định hàng ngày phù hợp với tầm nhìn — không còn lạc trong bận rộn.',
    'GEM Tarot — Khi đứng giữa 2 lựa chọn đầu tư khó, rút 1 quẻ để nghe trực giác nói gì. Không phải "đúng/sai" — là khoảng lặng 3 phút giúp bạn lắng xuống, thấy mình thực sự muốn gì trước khi click mua.',
    'GEM Master Sư Phụ AI — 2h sáng không ngủ được vì lo lệnh thua, bạn chat với AI "mình đang lo lắng" — AI không giảng bài trading, nó hỏi câu đúng để bạn nhìn ra pattern tâm lý của mình. Sáng hôm sau bạn ra quyết định tỉnh táo thay vì revenge trade.',
    "Templates giao dịch — Thay vì 6 tháng đọc sách trading, bạn copy 1 template đã được backtest, điều chỉnh theo khẩu vị rủi ro của mình, và bắt đầu ngay tuần sau. Tiết kiệm 6 tháng, tránh đống sai lầm người khác đã trả giá.",
    "Paper Trade — Thử 10 lệnh với vốn ảo, thấy mình có thói quen vào lệnh khi FOMO. Học được mà không mất tiền thật. Đến khi vào thật, bạn đã biết chính mình nhiều hơn 90% trader mới.",
    'Tần Số Tình Yêu — Sau 3 buổi, bạn bớt check điện thoại xem người kia có trả lời chưa. Bạn thấy mình đủ — không vì ai "cho đủ". Mối quan hệ chuyển từ "cần" sang "chọn" — nhẹ nhàng hơn rất nhiều.',
    'Master AI — 2 tuần sau khóa, bạn tiết kiệm 10-15 giờ/tuần nhờ AI làm việc hành chính, email, report. Thời gian đó dùng để chiến lược, chơi với con, hoặc nghỉ. Không phải "làm thêm" — mà "làm ít hơn mà đúng hơn".',
    "App GEMRAL — Thay vì mở 5 app khác nhau (Binance chart, Google Calendar, Notion, Spotify thiền, Messenger hỏi coach), bạn chỉ cần 1 app cho trading + tâm thức + nhật ký + community. Ít friction, nhiều focus. Đây là app bạn mở đầu tiên mỗi sáng và cuối cùng mỗi tối."
  ].join("\n");
}
function getAppFeaturesRule() {
  return '═══════════════════════════════════════════════════════════\n🔴 QUY TẮC VIẾT VỀ TÍNH NĂNG APP GEMRAL — USE-CASE FIRST\n═══════════════════════════════════════════════════════════\n\nKHI VIẾT VỀ APP GEMRAL hoặc BẤT KỲ TÍNH NĂNG NÀO CỦA APP:\n\n❌ CẤM viết theo format liệt kê:\n   "App GEMRAL có: (1) Scanner, (2) Vision Board, (3) Tarot, (4) AI…"\n\n✅ BẮT BUỘC viết theo use-case / benefit / cảm giác:\n   Mỗi tính năng PHẢI trả lời 3 câu:\n     1. "Trước khi dùng, người đọc khổ như thế nào?" (đặt vấn đề cụ thể, một khoảnh khắc)\n     2. "Khi dùng, họ làm gì cụ thể?" (bước hành động ngắn gọn, không technical)\n     3. "Kết quả họ CẢM giác ra sao?" (cảm xúc cụ thể, không "tốt" chung chung)\n\nVÍ DỤ ĐÚNG:\n   "2h sáng trở mình không ngủ được vì mới thua 3 lệnh liên tiếp, tay cứ muốn mở app vào lệnh gỡ.\n    Thay vào đó, bạn mở GEM Master Sư Phụ, gõ: ‘mình đang muốn revenge trade’.\n    AI không bảo đừng — nó hỏi: ‘điều gì khiến mình cảm thấy mình phải gỡ ngay đêm nay?’\n    15 phút sau, bạn nhận ra lệnh thua không phải do market — là do sáng nay mâu thuẫn với người yêu.\n    Bạn đóng app, đi ngủ. Sáng hôm sau, sổ sạch, đầu tỉnh — không còn muốn gỡ nữa."\n\nVÍ DỤ SAI (tuyệt đối không được viết như này):\n   "GEM Master là AI thông minh giúp bạn tư vấn tâm lý giao dịch 24/7.\n    Tính năng chính: chat không giới hạn, ghi nhớ context, gợi ý giải pháp."\n\nTone: empathic, specific, not salesy. Người đọc phải thấy MÌNH trong câu chuyện.\nTránh: từ marketing ("đột phá", "cách mạng", "tuyệt vời"), bullet list tính năng, so sánh với competitor.\nLuôn dùng: khoảnh khắc cụ thể, cảm xúc rõ, hành động nhỏ, kết quả đo đếm được bằng cảm giác.';
}
function getTermConversions() {
  return TERM_CONVERSIONS.map(({ en, vi }) => ({ en, vi }));
}
function getStructureForType(contentType) {
  switch (contentType) {
    case "latc":
      return 'CẤU TRÚC LATC (4000-5500 từ):\n\n1. HOOK (500 từ)\n   Mở đầu bằng câu chuyện/tình huống gây tò mò. Đặt câu hỏi lớn.\n   Tạo gap giữa "điều bạn nghĩ" vs "sự thật".\n   Kết hook: "Hôm nay Jennie sẽ chia sẻ [X] sự thật/bí mật/bài học..."\n\n2. PHẦN 1 (600-800 từ)\n   Sự thật/Bài học thứ nhất. Bắt đầu bằng statement mạnh.\n   1 ví dụ crypto + 1 ví dụ đời sống.\n   Rải 1-2 GEM tools tự nhiên trong nội dung.\n   Transition: "Ok, đó là sự thật thứ 1. Nhưng..."\n\n3. PHẦN 2 (600-800 từ)\n   Sự thật/Bài học thứ hai. Nâng cấp depth từ phần 1.\n   Dual examples. GEM tools weaved in.\n   Transition tự nhiên sang phần 3.\n\n4. PHẦN 3 (600-800 từ)\n   Sự thật/Bài học thứ ba. Cao trào bắt đầu build.\n   Dual examples. GEM tools weaved in.\n   Transition: "Nhưng đây mới là điều quan trọng nhất..."\n\n5. PHẦN 4 (600-800 từ)\n   Sự thật/Bài học thứ tư. Climax — insight sâu nhất.\n   Kết nối tất cả các phần trước thành bức tranh lớn.\n   Dual examples, đan xen emotional beat.\n\n6. PHẦN 5 (600-800 từ)\n   Sự thật/Bài học thứ năm. Resolution & transformation.\n   Từ insight → hành động cụ thể cho người nghe.\n\n7. CTA (200-300 từ)\n   Giới thiệu khóa học/sản phẩm liên quan TRƯỚC phần closing.\n   Giáo dục > Bán hàng. Không áp lực, chỉ gợi mở.\n   "Nếu bạn muốn đi sâu hơn..." / "Trong khóa [X], mình chia sẻ chi tiết hơn..."\n\n8. CLOSING (200 từ)\n   Touching, nhẹ nhàng, tin tưởng. Gửi năng lượng tích cực.\n   "Hẹn gặp lại bạn trong video tiếp theo..."\n   Kết bằng affirmation hoặc câu hỏi suy ngẫm.';
    case "tmt":
      return `CẤU TRÚC TMT — THỨC TỈNH TÂM THỨC (4500-5500 từ):

1. INTRO (400-500 từ)
   Đặt bối cảnh tâm linh/năng lượng. Tại sao chủ đề này quan trọng NGAY BÂY GIỜ.
   Kết nối với current energy (mùa, trăng, tiết khí, hoặc sự kiện vũ trụ).

2. TỔNG QUAN (500-600 từ)
   Bird's eye view của chủ đề. Giải thích framework/khái niệm chính.
   Tại sao phần lớn hiểu sai hoặc chưa đủ sâu.

3. PHẦN CHÍNH 1 (600-800 từ)
   Deep dive vào khía cạnh thứ nhất.
   1 ví dụ crypto/tài chính + 1 ví dụ tâm thức/đời sống.
   Rải GEM tools tự nhiên.

4. PHẦN CHÍNH 2 (600-800 từ)
   Deep dive vào khía cạnh thứ hai.
   Dual examples. Tần số là trung tâm giải thích.

5. PHẦN CHÍNH 3 (600-800 từ)
   Deep dive vào khía cạnh thứ ba.
   Connect dots giữa các phần. Emotional build-up.

6. PHẦN CHÍNH 4 (600-800 từ)
   Deep dive vào khía cạnh thứ tư.
   Practical application — làm thế nào áp dụng.

7. CAO TRÀO (400-500 từ)
   Climax — revelation lớn nhất. "Aha moment".
   Kết nối TẤN SỐ + NGHIỆP LỰC + hành động.

8. CLOSING (200-300 từ)
   Nhẹ nhàng, chữa lành, tin tưởng.
   Meditation ngắn hoặc affirmation kết bài.

9. CTA (200-300 từ)
   Đặt SAU closing nhưng TRƯỚC lời chào cuối.
   Giáo dục > Bán hàng. Liên kết sản phẩm với hành trình thức tỉnh.`;
    case "short_clip":
      return 'CẤU TRÚC SHORT CLIP (75-200 từ, 30-70 giây):\n\n1. PAIN/HOOK (1-2 câu, 5-10 giây)\n   Câu mở gây sốc hoặc đau điểm. Pattern-interrupt ngay giây đầu.\n   "Bạn có biết vì sao 95% trader thua lỗ?" / "Điều này không ai nói cho bạn..."\n\n2. STORY/CONTEXT (2-3 câu, 10-15 giây)\n   Micro-story hoặc bối cảnh ngắn gọn. Tạo emotional hook.\n\n3. INSIGHT (2-3 câu, 10-15 giây)\n   Sự thật/bài học chính. Câu trả lời cho pain point.\n   Kết nối với tần số hoặc nghiệp lực nếu phù hợp.\n\n4. SOLUTION (1-2 câu, 5-10 giây)\n   Hành động cụ thể người xem có thể làm NGAY.\n\n5. CTA (1 câu, 3-5 giây)\n   "Follow để xem phần 2" / "Link khóa học trong bio" / "Comment nếu bạn đồng ý"';
    case "social_post":
      return "CẤU TRÚC SOCIAL POST (50-500 từ):\n\n1. HOOK (1-2 câu)\n   Câu mở hấp dẫn, scroll-stopping. Emoji phù hợp.\n\n2. NỘI DUNG CHÍNH (3-8 câu)\n   Chia sẻ insight, story, hoặc tip. Ngắn gọn, dễ đọc.\n\n3. CTA (1-2 câu)\n   Kêu gọi tương tác: comment, share, save.\n\n4. HASHTAGS\n   5-15 hashtags phù hợp nền tảng.";
    case "news":
      return "CẤU TRÚC TIN TỨC / BLOG SEO (500-3000 từ):\n\n1. TIÊU ĐỀ SEO (60-70 ký tự, có keyword chính)\n\n2. META DESCRIPTION (150-155 ký tự)\n\n3. TL;DR (2-3 câu cho AI Search / Featured Snippet)\n\n4. MỞ ĐẦU (100-150 từ)\n   Lead paragraph: Ai? Cái gì? Khi nào? Tại sao quan trọng?\n\n5. NỘI DUNG CHÍNH (H2/H3 structure)\n   Phân tích chuyên sâu, số liệu, nguồn dẫn.\n\n6. KẾT LUẬN\n   Tóm tắt 2-3 điểm chính + CTA phù hợp.";
  }
}
function getPersonaDescription(persona) {
  return PERSONA_DESCRIPTIONS[persona];
}
function getTrackDescription(track) {
  return TRACK_DESCRIPTIONS[track];
}
function buildGoldenRules() {
  return '10 QUY TẮC VÀNG — Tuân thủ TUYỆT ĐỐI:\n\n① DUAL EXAMPLES: Mỗi concept chính = 1 ví dụ crypto/tài chính + 1 ví dụ đời sống.\n   Không bao giờ chỉ có 1 loại ví dụ. Sự kết nối giữa tiền và đời sống là DNA của kênh.\n\n② DẪN VÀO BỐI CẢNH: Trước mỗi ví dụ, dẫn vào bằng:\n   "Trong thế giới đầu tư..." / "Ngoài thị trường, trong cuộc sống..."\n   "Hãy tưởng tượng bạn đang..." / "Quay lại với crypto..."\n\n③ GEM TOOLS RẢI ĐỀU: Nhắc đến các công cụ GEM xuyên suốt nội dung, rải đều trong từng phần.\n   KHÔNG dồn tất cả sản phẩm vào cuối bài. Mỗi phần nên tự nhiên weave 1-2 công cụ.\n   Ví dụ: "...và đây chính là lý do mình xây dựng GEM Scanner — để bạn không cần đoán..."\n\n④ TIẾNG VIỆT THUẦN TÚY: Sử dụng tiếng Việt cho mọi thuật ngữ. Không dùng tiếng Anh.\n   Bảng chuyển đổi bắt buộc:\n' + buildTermConversionTable() + '\n\n⑤ PROSE FLOWING: Viết dạng văn xuôi mượt mà, KHÔNG sử dụng bullet points.\n   Không dùng dấu gạch đầu dòng (-), dấu chấm (•), hay dấu sao (*) để liệt kê.\n   Thay vào đó, dùng câu chuyển tiếp: "Thứ nhất là...", "Tiếp theo,...", "Và quan trọng nhất,..."\n\n⑥ TẦN SỐ LÀ TRUNG TÂM: Tần số (frequency/vibration) là USP cốt lõi.\n   Mọi chủ đề đều phải quay về: "Tần số của bạn quyết định kết quả."\n   Trading thua? → Tần số thấp. Mối quan hệ đổ vỡ? → Tần số không match.\n\n⑦ CTA KHÓA HỌC TRƯỚC CLOSING: Luôn đặt phần giới thiệu khóa học/sản phẩm\n   TRƯỚC phần closing/lời chào cuối. Không bao giờ kết bài rồi mới bán.\n\n⑧ GIÁO DỤC > BÁN HÀNG: Sản phẩm KHÔNG xuất hiện trong tiêu đề.\n   Nội dung phải mang giá trị giáo dục thực sự. Sản phẩm chỉ là phần mở rộng tự nhiên.\n   "Nếu bạn muốn đi sâu hơn..." — không bao giờ "Mua ngay" hay "Đăng ký ngay".\n\n⑨ TRANSITION PHRASES: Giữa các phần, dùng câu chuyển tiếp đặc trưng:\n   "Ok, đó là sự thật thứ [N]. Nhưng..."\n   "Nhưng đây mới là điều quan trọng hơn..."\n   "Và bạn biết điều gì sẽ xảy ra tiếp theo không?"\n\n⑩ CLOSING TOUCHING: Phần kết phải nhẹ nhàng, ấm áp, tin tưởng.\n   Gửi năng lượng tích cực. Không áp lực, không FOMO.\n   "Hẹn gặp lại bạn..." / "Jennie tin bạn..." / "Chúng ta sẽ cùng nhau..."';
}
function buildTermConversionTable() {
  const conversions = getTermConversions();
  return conversions.map(({ en, vi }) => `   ${en} → ${vi}`).join("\n");
}
function buildForbiddenTermsList() {
  return 'THUẬT NGỮ CẤM — Không bao giờ sử dụng:\n\n• "tâm linh" → THAY BẰNG "tâm thức" (kênh tên "Thức Tỉnh Tâm Thức", không phải "tâm linh")\n• "dạy crypto" → THAY BẰNG "giúp bạn hiểu năng lượng đồng tiền"\n• "đảm bảo lợi nhuận" → XÓA HOÀN TOÀN (vi phạm pháp luật tài chính)\n• "giàu nhanh" → XÓA HOÀN TOÀN (tạo kỳ vọng sai lệch)\n• "ông" / "anh" khi nói về tu sĩ → THAY BẰNG "Thầy" / "Ngài"\n• Không dùng emoji trong script\n• Không hứa hẹn kết quả cụ thể về tài chính\n• Không so sánh tiêu cực với các kênh/người khác';
}
function buildSystemPrompt$1(params) {
  const {
    contentType,
    persona,
    writingMode,
    track,
    pillar,
    productHooks,
    contentTopic
  } = params;
  const sections = [];
  sections.push(
    '═══════════════════════════════════════════════════════════\nDANH TÍNH — IDENTITY\n═══════════════════════════════════════════════════════════\n\nBạn là Jennie Uyen Chu, nhà sáng tạo nội dung và founder của kênh YouTube "Thức Tỉnh Tâm Thức" với hơn 277,000 người đăng ký. Bạn kết hợp ĐỘC ĐÁO giữa kiến thức tài chính (crypto, trading, đầu tư) và tâm thức (thiền, năng lượng, tần số, nghiệp lực) để giúp người Việt vừa THỨC TỈNH vừa THỊNH VƯỢNG.\n\nKênh của bạn là nơi duy nhất mà một video có thể vừa phân tích Bitcoin vừa nói về nghiệp lực — và cả hai đều make sense.'
  );
  sections.push(
    '═══════════════════════════════════════════════════════════\nUSP — ĐIỂM ĐỘC ĐÁO\n═══════════════════════════════════════════════════════════\n\n"Jennie không chỉ giải thích CHUYỆN GÌ xảy ra, mà còn giải mã TẦN SỐ và NGHIỆP LỰC đằng sau — để bạn không chỉ HIỂU, mà còn KHÔNG LẶP LẠI sai lầm đó."\n\nĐây là kim chỉ nam cho MỌI nội dung. Mỗi bài viết phải:\n1. Giải thích hiện tượng (WHAT happened)\n2. Phân tích tần số/năng lượng đằng sau (WHY at frequency level)\n3. Hướng dẫn không lặp lại (HOW to break the pattern)'
  );
  sections.push(
    `═══════════════════════════════════════════════════════════
PERSONA — GIỌNG VĂN
═══════════════════════════════════════════════════════════

Persona hiện tại: ${persona}
${PERSONA_DESCRIPTIONS[persona]}`
  );
  sections.push(
    "═══════════════════════════════════════════════════════════\nCHẾ ĐỘ VIẾT — WRITING MODE\n═══════════════════════════════════════════════════════════\n\n" + WRITING_MODE_DESCRIPTIONS[writingMode]
  );
  sections.push(
    `═══════════════════════════════════════════════════════════
TRACK & PILLAR
═══════════════════════════════════════════════════════════

Track: ${TRACK_DESCRIPTIONS[track]}

Pillar: ${PILLAR_DESCRIPTIONS[pillar]}`
  );
  sections.push(
    "═══════════════════════════════════════════════════════════\nQUY TẮC VÀNG — GOLDEN RULES\n═══════════════════════════════════════════════════════════\n\n" + buildGoldenRules()
  );
  sections.push(
    "═══════════════════════════════════════════════════════════\nTHUẬT NGỮ CẤM — FORBIDDEN TERMS\n═══════════════════════════════════════════════════════════\n\n" + buildForbiddenTermsList()
  );
  sections.push(
    "═══════════════════════════════════════════════════════════\nSẢN PHẨM & CÔNG CỤ GEM\n═══════════════════════════════════════════════════════════\n\nCác công cụ và khóa học GEM để weave vào nội dung (rải đều, KHÔNG dồn cuối):\n\n" + getGemFeatures()
  );
  if (contentTopic === "app_features") {
    sections.push(getAppFeaturesRule());
  }
  if (productHooks && productHooks.length > 0) {
    sections.push(
      "═══════════════════════════════════════════════════════════\nPRODUCT HOOKS ƯU TIÊN\n═══════════════════════════════════════════════════════════\n\nƯu tiên nhắc đến các sản phẩm sau trong bài viết này:\n" + productHooks.map((hook) => `— ${hook}`).join("\n")
    );
  }
  sections.push(
    "═══════════════════════════════════════════════════════════\nCẤU TRÚC NỘI DUNG\n═══════════════════════════════════════════════════════════\n\n" + getStructureForType(contentType)
  );
  return sections.join("\n\n");
}

const PERSONA_LABELS$1 = {
  jennie_mentor: "Jennie Mentor — Người dẫn đường tâm linh, nhẹ nhàng nhưng sâu sắc",
  jennie_provocateur: "Jennie Provocateur — Thách thức tư duy, phá vỡ pattern cũ",
  jennie_storyteller: "Jennie Storyteller — Kể chuyện cuốn hút, kết nối cảm xúc",
  jennie_analyst: "Jennie Analyst — Phân tích dữ liệu, logic, evidence-based",
  jennie_motivator: "Jennie Motivator — Truyền năng lượng, thúc đẩy hành động",
  jennie_educator: "Jennie Educator — Dạy có hệ thống, giải thích rõ ràng",
  jennie_confidante: "Jennie Confidante — Tâm sự gần gũi, thấu hiểu nỗi đau"
};
const WRITING_MODE_LABELS = {
  mode_1_calm: "MODE 1 — Bình tĩnh, uy tín, nuôi dưỡng. Giọng ấm áp, sâu lắng.",
  mode_2_provocative: "MODE 2 — Táo bạo, khiêu khích, pattern-interrupting. Giọng mạnh mẽ, thẳng thắn."
};
const TRACK_LABELS$1 = {
  wealth: "Tài chính & Đầu tư",
  wellness: "Tâm linh & Sức khỏe tinh thần",
  integration: "Tích hợp Đời sống"
};
const PILLAR_LABELS = {
  spiritual: "Tâm linh / Tần số / Tâm thức",
  trading: "Trading / Crypto / Đầu tư",
  latc_money: "Tiền bạc & Tư duy tài chính",
  lifestyle: "Lối sống & Phát triển bản thân"
};
const GEM_TOOL_PATTERNS = [
  "GEM Scanner",
  "GEM Whale Tracker",
  "GEM Alert",
  "GEM Portfolio",
  "GEM Signal",
  "GEM App",
  "công cụ GEM",
  "ứng dụng GEM"
];
const DUAL_EXAMPLE_PATTERNS = [
  "ví dụ crypto",
  "ví dụ đời thường",
  "trong crypto",
  "trong cuộc sống",
  "ngoài đời",
  "trên chart",
  "tương tự trong",
  "giống như khi"
];
function buildSystemPrompt(persona, writingMode, track, pillar) {
  return `Bạn là ${PERSONA_LABELS$1[persona]}.

${WRITING_MODE_LABELS[writingMode]}

TRACK: ${TRACK_LABELS$1[track]}
PILLAR: ${PILLAR_LABELS[pillar]}

QUY TẮC TUYỆT ĐỐI:
1. Viết 100% tiếng Việt có dấu đầy đủ. KHÔNG dùng tiếng Anh trừ thuật ngữ chuyên ngành (Bitcoin, crypto, blockchain).
2. Xưng hô: "Jennie" (ngôi thứ 1), "bạn" (ngôi thứ 2). KHÔNG dùng "mình", "tôi", "chúng ta".
3. Câu ngắn. Mỗi câu tối đa 15 từ. Xuống dòng sau mỗi ý.
4. KHÔNG mở đầu bằng "Xin chào", "Chào mừng", hay bất kỳ lời chào nào.
5. KHÔNG dùng emoji trong kịch bản.
6. Mỗi ý chính cần CẢ HAI ví dụ: (a) ví dụ crypto/trading VÀ (b) ví dụ đời thường.
7. Nhắc đến công cụ GEM tự nhiên, không ép buộc — chỉ khi phù hợp ngữ cảnh.
8. Dùng format Markdown: ## cho tiêu đề phần, ### cho tiêu đề phụ.
9. Mỗi phần phải có transition mượt sang phần tiếp theo.
10. Kết thúc mỗi phần bằng câu "hook" giữ người xem ở lại.`;
}
function buildLATCPrompt(topic, persona, writingMode, productHooks) {
  const hookProducts = productHooks.length > 0 ? `

SẢN PHẨM CẦN NHẮC ĐẾN (rải đều trong 5 phần chính):
${productHooks.map((h, i) => `${i + 1}. ${h}`).join("\n")}` : "";
  const modeInstruction = writingMode === "mode_2_provocative" ? `
ĐẶC BIỆT MODE 2: Mở đầu bằng câu gây sốc. Dùng phản đề. Thách thức niềm tin cũ. Giọng thẳng thắn, không ngại đụng chạm.` : `
ĐẶC BIỆT MODE 1: Mở đầu nhẹ nhàng nhưng sâu. Dẫn dắt bằng cảm xúc. Giọng ấm áp, nuôi dưỡng.`;
  return `CHỦ ĐỀ: "${topic}"
PERSONA: ${PERSONA_LABELS$1[persona]}
${modeInstruction}

VIẾT KỊCH BẢN LATC THEO CẤU TRÚC SAU (4000-5500 từ tổng cộng):

## HOOK (500 từ — 10% tổng kịch bản)

Viết 6 bước theo thứ tự:
[A] Pain point — Nêu nỗi đau cụ thể mà khán giả đang trải qua. Dùng ngôn ngữ của họ.
[B] Dual examples — Cho 2 ví dụ song song: 1 từ crypto/trading, 1 từ đời thường.
[C] Reality check — Câu hỏi tu từ khiến họ tự vấn. "Bạn có bao giờ tự hỏi..."
[D] Promise — Hứa hẹn cụ thể về những gì họ sẽ nhận được sau video này.
[E] Teaser — Nhắc 1 insight bất ngờ sẽ xuất hiện ở phần sau. "Và ở phần 4, Jennie sẽ tiết lộ..."
[F] Welcome — Câu chào đón vào video. KHÔNG dùng "Xin chào" — dùng style riêng.

## PHẦN 1: [Tiêu đề phần 1] (600-800 từ)

Viết 7 bước cho mỗi phần:
1. Bold statement — Mở đầu bằng nhận định mạnh, đi ngược số đông.
2. Jennie story — Kể 1 câu chuyện cá nhân của Jennie liên quan đến ý này.
3. DUAL EXAMPLES — Ví dụ crypto/trading + Ví dụ đời thường. Cả hai phải liên kết.
4. Tâm thức concept — Giải thích khái niệm tâm thức/tần số liên quan.
5. Bài tập + GEM Tool — Đề xuất bài tập thực hành. Nếu phù hợp, nhắc công cụ GEM.
6. Insight — Câu insight đáng ghi nhớ, đúc kết ý chính.
7. Transition — Câu chuyển mượt sang phần tiếp theo.

## PHẦN 2: [Tiêu đề phần 2] (600-800 từ)
(Cùng 7 bước như trên)

## PHẦN 3: [Tiêu đề phần 3] (600-800 từ)
(Cùng 7 bước như trên)

## PHẦN 4: [Tiêu đề phần 4] (600-800 từ)
(Cùng 7 bước như trên)

## PHẦN 5: [Tiêu đề phần 5] (600-800 từ)
(Cùng 7 bước như trên)

## CTA KHÓA HỌC (200-300 từ — trước phần closing)

Viết 4 bước:
1. Summary — Tóm tắt 5 điều đã chia sẻ trong 1-2 câu mỗi điều.
2. "Hiểu hay sống?" — Đặt câu hỏi: kiến thức suông hay thay đổi thật?
3. Course transformation — Mô tả sự chuyển đổi cụ thể khi tham gia khóa học. KHÔNG nói giá. KHÔNG nói tên khóa học trực tiếp.
4. "Không dành cho tất cả" — Khẳng định khóa học chỉ phù hợp với người sẵn sàng thay đổi.

## CLOSING (200 từ)

Viết 5 bước:
1. Touching — Câu chạm cảm xúc sâu, gợi reflection.
2. App summary — Nhắc ứng dụng GEM như công cụ đồng hành hàng ngày.
3. Comment — Mời comment bằng câu hỏi cụ thể liên quan đến chủ đề.
4. Like/Sub — Nhắc nhẹ like/subscribe bằng lý do (để không bỏ lỡ phần tiếp).
5. Teaser — Preview nội dung video tiếp theo.${hookProducts}

YÊU CẦU QUAN TRỌNG:
- Tổng kịch bản: 4000-5500 từ tiếng Việt.
- Mỗi phần (1-5) phải có ÍT NHẤT 1 cặp dual examples (crypto + đời thường).
- Product hooks phải được rải đều, tự nhiên — KHÔNG tập trung hết ở 1 phần.
- Dùng Markdown: ## cho phần chính, ### cho phần phụ.
- Câu ngắn. Tối đa 15 từ/câu. Xuống dòng sau mỗi ý.`;
}
function buildTMTPrompt(topic, persona, writingMode) {
  const modeInstruction = writingMode === "mode_2_provocative" ? `
MODE 2: Giọng mạnh mẽ hơn. Phơi bày thẳng thắn. Dùng phản đề sắc bén.` : `
MODE 1: Giọng kính trọng, sâu lắng. Phân tích bằng lòng từ bi.`;
  return `CHỦ ĐỀ: "${topic}"
PERSONA: ${PERSONA_LABELS$1[persona]}
${modeInstruction}

VIẾT KỊCH BẢN TMT (Thầy Minh Tuệ Commentary) THEO CẤU TRÚC SAU (4500-5500 từ tổng cộng):

QUY TẮC TMT ĐẶC BIỆT:
- Gọi Sư Minh Tuệ bằng "Thầy" hoặc "Ngài". TUYỆT ĐỐI KHÔNG dùng "ông", "anh".
- Khi phê bình ai: KHÔNG nêu tên cụ thể → dùng cách gọi "Đề Bà Đạt Đa 5.0" (ẩn dụ cho người chống phá).
- Mọi nhận định phải evidence-based — có dẫn chứng hoặc logic rõ ràng.
- Framing nhân quả: mọi sự việc đều có nhân-duyên-quả.
- Giọng văn kính trọng với Thầy, thẳng thắn với hiện tượng xã hội.

## PHẦN 1: INTRO (300-400 từ)

3 bước:
1. Hook mạnh — Mở đầu bằng sự kiện/hiện tượng gây chú ý liên quan đến Thầy Minh Tuệ hoặc tu hành.
2. Drama — Nêu mâu thuẫn/xung đột trung tâm của chủ đề. Tại sao vấn đề này quan trọng?
3. Promise — Hứa hẹn: video này sẽ phân tích điều gì? Người xem sẽ hiểu được gì?

## PHẦN 2: TỔNG QUAN (400-500 từ)

3 bước:
1. "Tội danh" — Liệt kê các hành vi/hiện tượng đáng phân tích. Dùng ngôn ngữ mạnh nhưng công bằng.
2. Pattern — Chỉ ra pattern lặp lại. "Đây không phải lần đầu..."
3. Tương phản — So sánh: hành vi của Thầy vs. hành vi của "Đề Bà Đạt Đa 5.0".

## PHẦN 3: [Tiêu đề — điểm phân tích 1, nhẹ nhất] (500-700 từ)

Phân tích từ nhẹ đến nặng. Evidence-based.
- Nêu sự kiện/bằng chứng cụ thể.
- Phân tích dưới góc nhìn Phật pháp.
- Kết nối với đời thường.

## PHẦN 4: [Tiêu đề — điểm phân tích 2] (500-700 từ)

Nặng hơn phần 3. Đào sâu hơn.
- Evidence-based claims.
- Nhân quả framing: "Gieo nhân gì, gặt quả nấy."
- Câu chuyện hoặc ví dụ minh họa.

## PHẦN 5: [Tiêu đề — điểm phân tích 3] (500-700 từ)

Nặng hơn phần 4.
- Phơi bày động cơ ẩn giấu.
- Đối chiếu với kinh điển (nếu phù hợp).

## PHẦN 6: [Tiêu đề — điểm phân tích 4] (500-700 từ)

Gần climax. Tension cao.
- Tích lũy bằng chứng.
- Build-up cảm xúc.

## PHẦN 7: CLIMAX (700-900 từ)

Phần quan trọng nhất. Đánh dấu bằng ★.
3 bước:
1. Triết học — Nâng vấn đề lên tầm triết học Phật giáo. Vô thường, nhân quả, nghiệp.
2. Revelation — Tiết lộ insight bất ngờ. "Và đây là điều ít ai nhận ra..."
3. "Cảm ơn nghịch duyên" — Reframe: ngay cả người chống phá cũng là duyên giúp Thầy và chúng ta trưởng thành.

## PHẦN 8: CLOSING (500-600 từ)

3 bước:
1. Tổng kết — Đúc kết 4-5 điểm chính đã phân tích.
2. Hạnh tu — Liên hệ với hành trình tu tập cá nhân. "Mỗi chúng ta đều có thể..."
3. Touching — Câu chạm cảm xúc sâu về lòng kính trọng với Thầy.

## PHẦN 9: CTA 4 LỚP (200-250 từ)

4 bước CTA chồng lên nhau:
1. Engagement — "Bạn nghĩ sao? Comment chia sẻ góc nhìn..."
2. Document — "Video này là tài liệu lưu giữ. Hãy save lại..."
3. Subscribe — "Bấm subscribe + chuông để không bỏ lỡ phần tiếp theo..."
4. Fanpage — "Tham gia cộng đồng trên fanpage để thảo luận sâu hơn..."

YÊU CẦU QUAN TRỌNG:
- Tổng kịch bản: 4500-5500 từ tiếng Việt.
- Đảm bảo escalation: nhẹ → nặng từ phần 3 đến phần 7.
- Phần 7 (Climax) là phần dài nhất và sâu nhất.
- Giọng văn phải nhất quán: kính trọng Thầy, thẳng thắn với hiện tượng.
- Dùng Markdown: ## cho phần chính.
- Câu ngắn. Tối đa 15 từ/câu.`;
}
function buildClipPrompt(topic, persona, writingMode) {
  if (writingMode === "mode_2_provocative") {
    return `CHỦ ĐỀ: "${topic}"
PERSONA: ${PERSONA_LABELS$1[persona]}

VIẾT KỊCH BẢN SHORT CLIP MODE 2 (PROVOCATIVE) — 75-200 từ, 30-70 giây:

CẤU TRÚC 7 BƯỚC:

### Bước 1: Cognitive Dissonance (3 giây)
Mở đầu bằng câu đi ngược 100% niềm tin phổ biến.
"Bạn nghĩ [X] là đúng? Sai hoàn toàn."

### Bước 2: Voice frustration (5 giây)
Nói lên sự thất vọng mà khán giả đang cảm nhận nhưng chưa dám nói.
"Jennie cũng từng tin điều đó. Và Jennie đã trả giá..."

### Bước 3: Brutal honesty (7 giây)
Sự thật trần trụi. Không đường mật.
Dùng con số hoặc ví dụ cụ thể.

### Bước 4: Reframe (10 giây)
Lật ngược góc nhìn.
"Nhưng nếu bạn nhìn từ góc này..."

### Bước 5: Metaphor (7 giây)
Ẩn dụ mạnh kết nối ý chính với trải nghiệm quen thuộc.

### Bước 6: Solution (7 giây)
Show Don't Tell. Giải pháp cụ thể, hành động được ngay.
Nếu phù hợp, nhắc công cụ GEM.

### Bước 7: Identity shift (5 giây)
Kết bằng câu thay đổi danh tính.
"Bạn không phải người [X]. Bạn là người [Y]."
CTA khéo léo — KHÔNG nói giá.

YÊU CẦU:
- Tổng: 75-200 từ (30-70 giây khi đọc).
- Câu cực ngắn. 5-10 từ/câu.
- Mỗi câu 1 dòng.
- KHÔNG emoji.
- Dùng Markdown: ### cho mỗi bước.`;
  }
  return `CHỦ ĐỀ: "${topic}"
PERSONA: ${PERSONA_LABELS$1[persona]}

VIẾT KỊCH BẢN SHORT CLIP MODE 1 (CALM) — 75-200 từ, 30-70 giây:

CẤU TRÚC 5 BƯỚC:

### Bước 1: ĐAU (Pain) — 3 giây giữ người xem
Mở đầu bằng nỗi đau cụ thể, quen thuộc.
"Bạn có bao giờ [pain point]?"
Dùng ngôn ngữ của khán giả, không học thuật.

### Bước 2: TRẢI NGHIỆM (Story) — 10 giây
Kể câu chuyện cá nhân ngắn gọn của Jennie.
"Jennie từng [trải nghiệm]..."
Tạo kết nối cảm xúc.

### Bước 3: INSIGHT (Revelation) — 10 giây
"Và rồi Jennie nhận ra..."
Tiết lộ insight bất ngờ.
Kết nối pain point với sự thật sâu hơn.

### Bước 4: GIẢI PHÁP (Solution) — 10 giây
Show Don't Tell.
Cho hành động cụ thể, làm được ngay.
Nếu phù hợp, nhắc công cụ GEM tự nhiên.

### Bước 5: CTA KHÉO LÉO — 5 giây
KHÔNG nói giá.
KHÔNG nói tên khóa học.
Kết bằng câu hỏi hoặc câu khiến người xem suy nghĩ.
"Bạn sẽ chọn [A] hay [B]?"

YÊU CẦU:
- Tổng: 75-200 từ (30-70 giây khi đọc).
- Câu cực ngắn. 5-10 từ/câu.
- Mỗi câu 1 dòng.
- KHÔNG emoji.
- Dùng Markdown: ### cho mỗi bước.`;
}
function parseScript(content, _contentType) {
  const sections = [];
  const headerPattern = /^## (.+)$/gm;
  const matches = [];
  let match;
  while ((match = headerPattern.exec(content)) !== null) {
    const captured = match[1];
    if (captured !== void 0) {
      matches.push({ title: captured.trim(), index: match.index });
    }
  }
  if (matches.length === 0) {
    return [{
      title: "Nội dung",
      content: content.trim(),
      wordCount: vietnameseNLP.countWords(content),
      order: 0,
      hasGemTool: checkHasGemTool(content),
      hasDualExample: checkHasDualExample(content)
    }];
  }
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    if (!currentMatch) continue;
    const nextMatch = matches[i + 1];
    const startIndex = currentMatch.index;
    const endIndex = nextMatch ? nextMatch.index : content.length;
    const sectionContent = content.slice(startIndex, endIndex).trim();
    const firstNewline = sectionContent.indexOf("\n");
    const bodyContent = firstNewline >= 0 ? sectionContent.slice(firstNewline + 1).trim() : "";
    sections.push({
      title: currentMatch.title,
      content: bodyContent,
      wordCount: vietnameseNLP.countWords(bodyContent),
      order: i,
      hasGemTool: checkHasGemTool(bodyContent),
      hasDualExample: checkHasDualExample(bodyContent)
    });
  }
  return sections;
}
function checkHasGemTool(text) {
  const lowerText = text.toLowerCase();
  return GEM_TOOL_PATTERNS.some((pattern) => lowerText.includes(pattern.toLowerCase()));
}
function checkHasDualExample(text) {
  const lowerText = text.toLowerCase();
  let matchCount = 0;
  for (const pattern of DUAL_EXAMPLE_PATTERNS) {
    if (lowerText.includes(pattern.toLowerCase())) {
      matchCount++;
    }
  }
  return matchCount >= 2;
}
function getMaxTokens(contentType) {
  switch (contentType) {
    case "latc":
      return 16384;
    // 4000-5500 từ cần nhiều token
    case "tmt":
      return 16384;
    // 4500-5500 từ
    case "short_clip":
      return 2048;
    // 75-200 từ
    case "social_post":
      return 4096;
    // 50-500 từ
    case "news":
      return 16384;
  }
}
function getTemperature(writingMode) {
  return writingMode === "mode_2_provocative" ? 0.85 : 0.7;
}
const scriptGenerator = {
  /**
   * Tạo kịch bản LATC (Long-form Authority Thought-leader Content).
   * Cấu trúc: Hook → 5 Phần chính → CTA Khóa học → Closing.
   * Tổng: 4000-5500 từ.
   */
  async generateLATC(params) {
    const systemPrompt = buildSystemPrompt(
      params.persona,
      params.writingMode,
      params.track,
      params.pillar
    );
    const userPrompt = buildLATCPrompt(
      params.topic,
      params.persona,
      params.writingMode,
      params.productHooks ?? []
    );
    const result = await claudeService.generate({
      systemPrompt,
      userPrompt,
      maxTokens: getMaxTokens("latc"),
      temperature: getTemperature(params.writingMode),
      onStream: params.onStream
    });
    const sections = parseScript(result.content);
    const wordCount = vietnameseNLP.countWords(result.content);
    const estimatedDuration = vietnameseNLP.estimateDuration(result.content);
    return {
      content: result.content,
      wordCount,
      estimatedDuration,
      sections
    };
  },
  /**
   * Tạo kịch bản TMT (Thầy Minh Tuệ Commentary).
   * Cấu trúc: Intro → Tổng quan → 4 Phần phân tích (nhẹ→nặng) → Climax → Closing → CTA 4 lớp.
   * Tổng: 4500-5500 từ.
   *
   * Quy tắc TMT:
   * - "Thầy"/"Ngài" (không "ông"/"anh")
   * - Không nêu tên khi phê bình → "Đề Bà Đạt Đa 5.0"
   * - Evidence-based claims
   * - Nhân quả framing
   */
  async generateTMT(params) {
    const systemPrompt = buildSystemPrompt(
      params.persona,
      params.writingMode,
      params.track,
      params.pillar
    );
    const userPrompt = buildTMTPrompt(
      params.topic,
      params.persona,
      params.writingMode
    );
    const result = await claudeService.generate({
      systemPrompt,
      userPrompt,
      maxTokens: getMaxTokens("tmt"),
      temperature: getTemperature(params.writingMode),
      onStream: params.onStream
    });
    const sections = parseScript(result.content);
    const wordCount = vietnameseNLP.countWords(result.content);
    const estimatedDuration = vietnameseNLP.estimateDuration(result.content);
    return {
      content: result.content,
      wordCount,
      estimatedDuration,
      sections
    };
  },
  /**
   * Tạo kịch bản Short Clip (30-70 giây).
   * Mode 1: 5 bước — Đau → Story → Insight → Giải pháp → CTA.
   * Mode 2: 7 bước — Cognitive Dissonance → Frustration → Brutal honesty → Reframe → Metaphor → Solution → Identity shift.
   * Tổng: 75-200 từ.
   */
  async generateShortClip(params) {
    const systemPrompt = buildSystemPrompt(
      params.persona,
      params.writingMode,
      params.track,
      params.pillar
    );
    const userPrompt = buildClipPrompt(
      params.topic,
      params.persona,
      params.writingMode
    );
    const result = await claudeService.generate({
      systemPrompt,
      userPrompt,
      maxTokens: getMaxTokens("short_clip"),
      temperature: getTemperature(params.writingMode),
      onStream: params.onStream
    });
    const sections = parseScript(result.content);
    const wordCount = vietnameseNLP.countWords(result.content);
    const estimatedDuration = vietnameseNLP.estimateDuration(result.content);
    return {
      content: result.content,
      wordCount,
      estimatedDuration,
      sections
    };
  },
  /**
   * Parse kịch bản đã tạo thành các section riêng biệt.
   * Tách theo ## headers, đếm từ, kiểm tra GEM tool và dual examples.
   */
  parseScript,
  /**
   * Xây dựng prompt LATC cho Claude.
   */
  buildLATCPrompt,
  /**
   * Xây dựng prompt TMT cho Claude.
   */
  buildTMTPrompt,
  /**
   * Xây dựng prompt Short Clip cho Claude.
   */
  buildClipPrompt
};

const MAX_TITLE_LENGTH_STANDARD = 65;
const MAX_TITLE_LENGTH_CLIP = 50;
const TRACK_CONTEXT = {
  wealth: "Tài chính, đầu tư, crypto, trading",
  wellness: "Tâm linh, thiền, tần số, chữa lành",
  integration: "Tích hợp đời sống, phát triển bản thân"
};
const FORBIDDEN_PRODUCT_NAMES = [
  "GEM",
  "GEM App",
  "GEM Scanner",
  "GEM Whale",
  "khóa học",
  "course",
  "chương trình",
  "đăng ký",
  "mua ngay",
  "giá",
  "miễn phí",
  "free"
];
const ENGLISH_STOPWORDS = [
  "the",
  "and",
  "for",
  "you",
  "this",
  "that",
  "with",
  "from",
  "your",
  "how",
  "why",
  "what",
  "when",
  "where",
  "who"
];
function buildLATCTitlePrompt(topic, track, scriptSummary) {
  return `Tạo tiêu đề video YouTube cho chủ đề: "${topic}"
Lĩnh vực: ${TRACK_CONTEXT[track]}
${scriptSummary ? `Tóm tắt nội dung: ${scriptSummary}` : ""}

Tạo 3 tiêu đề, mỗi tiêu đề theo 1 trong 4 công thức dưới đây (chọn 3 công thức phù hợp nhất):

CÔNG THỨC A — Tương phản nhỏ→lớn:
"Từ [điều nhỏ bé] → [điều lớn lao đầy ý nghĩa]"
Ví dụ: "Từ 1 Đồng Xu → Tần Số Thay Đổi Cả Cuộc Đời"

CÔNG THỨC B — Số + Bí mật:
"[Số] Sự Thật/Thói Quen/Bí Mật Về [chủ đề]..."
Ví dụ: "5 Thói Quen Buổi Sáng Nâng Tần Số Ngay Lập Tức"

CÔNG THỨC C — Tại sao + Pain + Tần số:
"Tại Sao [nỗi đau]? — Đây Là Tần Số..."
Ví dụ: "Tại Sao Bạn Cứ Mất Tiền? — Đây Là Tần Số Đang Phá Hoại Bạn"

CÔNG THỨC D — Keyword bí ẩn:
"Một [từ/điều/thói quen] thôi cũng thay đổi tần số..."
Ví dụ: "Một Từ Thôi Cũng Thay Đổi Tần Số Tiền Bạc Của Bạn"

QUY TẮC:
- Dưới 65 ký tự.
- KHÔNG có tên sản phẩm, khóa học, hay app.
- Tiếng Việt có dấu đầy đủ.
- CTR mục tiêu: 8-14%.
- Viết hoa chữ cái đầu mỗi từ quan trọng.
- Dùng dấu "..." hoặc "—" để tạo tò mò.

Trả lời CHÍNH XÁC theo format JSON sau (không thêm text nào khác):
[
  {
    "formula": "A",
    "formulaName": "Tương phản nhỏ→lớn",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "10-12%"
  },
  {
    "formula": "B",
    "formulaName": "Số + Bí mật",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "9-11%"
  },
  {
    "formula": "C",
    "formulaName": "Tại sao + Pain",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "8-10%"
  }
]`;
}
function buildTMTTitlePrompt(topic, track, scriptSummary) {
  return `Tạo tiêu đề video YouTube TMT (Thầy Minh Tuệ Commentary) cho chủ đề: "${topic}"
Lĩnh vực: ${TRACK_CONTEXT[track]}
${scriptSummary ? `Tóm tắt nội dung: ${scriptSummary}` : ""}

Tạo 3 tiêu đề, mỗi tiêu đề theo 1 trong 5 công thức dưới đây (chọn 3 công thức phù hợp nhất):

CÔNG THỨC A — Keyword + Drama:
"[SƯ MINH TUỆ]: [Drama hook]"
Ví dụ: "SƯ MINH TUỆ: Sự Thật Đằng Sau Cuộc Hành Trình..."

CÔNG THỨC B — Số + Bí mật:
"SƯ MINH TUỆ — [Số] Bí Mật Về [Chủ đề]..."
Ví dụ: "SƯ MINH TUỆ — 5 Bí Mật Về Cuộc Sống Khất Thực"

CÔNG THỨC C — Câu hỏi:
"SƯ MINH TUỆ: Tại Sao [Câu hỏi]?"
Ví dụ: "SƯ MINH TUỆ: Tại Sao Ngài Từ Chối Mọi Cúng Dường?"

CÔNG THỨC D — Hành trình:
"SƯ MINH TUỆ — Hành Trình [Mô tả hành trình]..."
Ví dụ: "SƯ MINH TUỆ — Hành Trình 6 Năm Không Một Đồng"

CÔNG THỨC E — Cảnh báo + Nhân quả:
"SƯ MINH TUỆ: CẢNH BÁO — [Cảnh báo liên quan nhân quả]"
Ví dụ: "SƯ MINH TUỆ: CẢNH BÁO — Nhân Quả Với Người Phỉ Báng Tu Hành"

QUY TẮC ĐẶC BIỆT TMT:
- "SƯ MINH TUỆ" PHẢI xuất hiện ĐẦU TIÊN trong tiêu đề.
- Dưới 65 ký tự.
- KHÔNG có tên sản phẩm, khóa học, hay app.
- Tiếng Việt có dấu đầy đủ.
- Giọng kính trọng — KHÔNG giật gân rẻ tiền.

Trả lời CHÍNH XÁC theo format JSON sau (không thêm text nào khác):
[
  {
    "formula": "A",
    "formulaName": "Keyword + Drama",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "10-12%"
  },
  {
    "formula": "C",
    "formulaName": "Câu hỏi",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "9-11%"
  },
  {
    "formula": "E",
    "formulaName": "Cảnh báo + Nhân quả",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "8-10%"
  }
]`;
}
function buildClipTitlePrompt(topic, track, scriptSummary) {
  return `Tạo tiêu đề Short Clip (TikTok/Reels/Shorts) cho chủ đề: "${topic}"
Lĩnh vực: ${TRACK_CONTEXT[track]}
${scriptSummary ? `Tóm tắt nội dung: ${scriptSummary}` : ""}

Tạo 3 tiêu đề ngắn, punchy, tối ưu cho mobile:

QUY TẮC:
- Dưới 50 ký tự (hiển thị tốt trên mobile).
- Gây tò mò ngay lập tức.
- Tiếng Việt có dấu đầy đủ.
- Dùng 1 trong các pattern:
  + Câu hỏi ngắn: "Tại sao...?"
  + Thách thức: "Bạn dám [X] không?"
  + Bí mật: "[Số] điều về [X]..."
  + Phản đề: "[X] không như bạn nghĩ"
  + Cảm xúc: "Khi [tình huống đau]..."

Trả lời CHÍNH XÁC theo format JSON sau (không thêm text nào khác):
[
  {
    "formula": "question",
    "formulaName": "Câu hỏi ngắn",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "12-15%"
  },
  {
    "formula": "challenge",
    "formulaName": "Thách thức",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "11-14%"
  },
  {
    "formula": "emotion",
    "formulaName": "Cảm xúc",
    "title": "tiêu đề ở đây",
    "estimatedCtr": "10-13%"
  }
]`;
}
function parseJsonTitles(response) {
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Không tìm thấy JSON hợp lệ trong phản hồi tạo tiêu đề.");
  }
  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) {
    throw new Error("Phản hồi tạo tiêu đề không phải mảng JSON.");
  }
  const results = [];
  for (const item of parsed) {
    if (typeof item === "object" && item !== null && "formula" in item && "formulaName" in item && "title" in item && "estimatedCtr" in item) {
      const record = item;
      const formula = record.formula;
      const formulaName = record.formulaName;
      const title = record.title;
      const estimatedCtr = record.estimatedCtr;
      if (typeof formula === "string" && typeof formulaName === "string" && typeof title === "string" && typeof estimatedCtr === "string") {
        results.push({ formula, formulaName, title, estimatedCtr });
      }
    }
  }
  if (results.length === 0) {
    throw new Error("Không có tiêu đề hợp lệ trong phản hồi.");
  }
  return results;
}
function validateTitle(title, contentType) {
  const warnings = [];
  const maxLength = contentType === "short_clip" ? MAX_TITLE_LENGTH_CLIP : MAX_TITLE_LENGTH_STANDARD;
  if (title.length > maxLength) {
    warnings.push(
      `Tiêu đề vượt quá ${maxLength} ký tự (hiện tại: ${title.length} ký tự).`
    );
  }
  const lowerTitle = title.toLowerCase();
  for (const forbidden of FORBIDDEN_PRODUCT_NAMES) {
    if (lowerTitle.includes(forbidden.toLowerCase())) {
      warnings.push(
        `Tiêu đề chứa từ cấm "${forbidden}". Không được nhắc tên sản phẩm/khóa học trong tiêu đề.`
      );
    }
  }
  const vietnameseAccentPattern = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;
  if (!vietnameseAccentPattern.test(title)) {
    warnings.push(
      "Tiêu đề không có dấu tiếng Việt. Cần viết đầy đủ dấu."
    );
  }
  const words = title.toLowerCase().split(/\s+/);
  const foundEnglish = [];
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, "");
    if (cleanWord.length > 0 && ENGLISH_STOPWORDS.includes(cleanWord)) {
      foundEnglish.push(cleanWord);
    }
  }
  if (foundEnglish.length > 0) {
    warnings.push(
      `Tiêu đề chứa từ tiếng Anh không cần thiết: ${foundEnglish.join(", ")}. Nên dùng tiếng Việt.`
    );
  }
  if (contentType === "tmt") {
    const trimmedTitle = title.trim();
    const startsWithSMT = trimmedTitle.startsWith("SƯ MINH TUỆ") || trimmedTitle.startsWith("Sư Minh Tuệ");
    if (!startsWithSMT) {
      warnings.push(
        'Tiêu đề TMT phải bắt đầu bằng "SƯ MINH TUỆ". Đây là quy tắc bắt buộc cho nội dung TMT.'
      );
    }
  }
  return {
    valid: warnings.length === 0,
    warnings
  };
}
const TITLE_SYSTEM_PROMPT = `Bạn là chuyên gia tạo tiêu đề video YouTube tiếng Việt cho kênh Jennie.
Bạn hiểu sâu về:
- Thuật toán YouTube và CTR optimization.
- Tâm lý người xem Việt Nam.
- Cách viết tiêu đề gây tò mò mà không clickbait rẻ tiền.

QUY TẮC:
- Trả lời ĐÚNG format JSON được yêu cầu.
- KHÔNG thêm giải thích hay text ngoài JSON.
- Tiếng Việt có dấu đầy đủ.
- KHÔNG dùng emoji trong tiêu đề.`;
const titleGenerator = {
  /**
   * Tạo tiêu đề LATC — 3 tiêu đề theo 3/4 công thức:
   * A: Tương phản nhỏ→lớn
   * B: Số + Bí mật
   * C: Tại sao + Pain + Tần số
   * D: Keyword bí ẩn
   *
   * Yêu cầu: dưới 65 ký tự, không tên sản phẩm, CTR 8-14%.
   */
  async generateLATCTitles(params) {
    const userPrompt = buildLATCTitlePrompt(
      params.topic,
      params.track,
      params.scriptSummary ?? ""
    );
    const result = await claudeService.generate({
      systemPrompt: TITLE_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 1024,
      temperature: 0.8,
      onStream: params.onStream
    });
    const rawTitles = parseJsonTitles(result.content);
    const titles = rawTitles.map((raw) => ({
      formula: raw.formula,
      formulaName: raw.formulaName,
      title: raw.title,
      charCount: raw.title.length,
      estimatedCtr: raw.estimatedCtr
    }));
    return {
      titles,
      topic: params.topic,
      contentType: "latc"
    };
  },
  /**
   * Tạo tiêu đề TMT — 3 tiêu đề theo 3/5 công thức:
   * A: Keyword + Drama
   * B: Số + Bí mật
   * C: Câu hỏi
   * D: Hành trình
   * E: Cảnh báo + Nhân quả
   *
   * Đặc biệt: "SƯ MINH TUỆ" phải xuất hiện ĐẦU TIÊN.
   */
  async generateTMTTitles(params) {
    const userPrompt = buildTMTTitlePrompt(
      params.topic,
      params.track,
      params.scriptSummary ?? ""
    );
    const result = await claudeService.generate({
      systemPrompt: TITLE_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 1024,
      temperature: 0.8,
      onStream: params.onStream
    });
    const rawTitles = parseJsonTitles(result.content);
    const titles = rawTitles.map((raw) => ({
      formula: raw.formula,
      formulaName: raw.formulaName,
      title: raw.title,
      charCount: raw.title.length,
      estimatedCtr: raw.estimatedCtr
    }));
    return {
      titles,
      topic: params.topic,
      contentType: "tmt"
    };
  },
  /**
   * Tạo tiêu đề Short Clip — 3 tiêu đề ngắn, punchy:
   * Dưới 50 ký tự (tối ưu mobile).
   * Patterns: câu hỏi, thách thức, bí mật, phản đề, cảm xúc.
   */
  async generateClipTitles(params) {
    const userPrompt = buildClipTitlePrompt(
      params.topic,
      params.track,
      params.scriptSummary ?? ""
    );
    const result = await claudeService.generate({
      systemPrompt: TITLE_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 1024,
      temperature: 0.85,
      onStream: params.onStream
    });
    const rawTitles = parseJsonTitles(result.content);
    const titles = rawTitles.map((raw) => ({
      formula: raw.formula,
      formulaName: raw.formulaName,
      title: raw.title,
      charCount: raw.title.length,
      estimatedCtr: raw.estimatedCtr
    }));
    return {
      titles,
      topic: params.topic,
      contentType: "short_clip"
    };
  },
  /**
   * Validate tiêu đề theo quy tắc:
   * - Kiểm tra độ dài ký tự (65 cho LATC/TMT, 50 cho clip)
   * - Kiểm tra tên sản phẩm/khóa học
   * - Kiểm tra dấu tiếng Việt
   * - Kiểm tra từ tiếng Anh không cần thiết
   * - Kiểm tra vị trí "SƯ MINH TUỆ" cho TMT
   */
  validateTitle
};

const CONTENT_TYPE_LABELS = {
  latc: "LATC (Long-form Authority Thought-leader Content)",
  tmt: "TMT (Thầy Minh Tuệ Commentary)",
  short_clip: "Short Clip"
};
const TRACK_LABELS = {
  wealth: "Tài chính & Đầu tư",
  wellness: "Tâm linh & Sức khỏe tinh thần",
  integration: "Tích hợp Đời sống"
};
const PERSONA_LABELS = {
  jennie_mentor: "Jennie Mentor",
  jennie_provocateur: "Jennie Provocateur",
  jennie_storyteller: "Jennie Storyteller",
  jennie_analyst: "Jennie Analyst",
  jennie_motivator: "Jennie Motivator",
  jennie_educator: "Jennie Educator",
  jennie_confidante: "Jennie Confidante"
};
const TELEPROMPTER_SEPARATOR = ">>>";
const EMPHASIS_PATTERNS = [
  /\*\*(.+?)\*\*/g,
  // Bold markdown
  /__(.*?)__/g
  // Underline-style bold
];
function formatVietnameseDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return dateString;
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
function sanitizeFilename(text) {
  return text.normalize("NFC").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 80);
}
function formatDateForFilename(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    const now = /* @__PURE__ */ new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
const exportService = {
  /**
   * Chuyển đổi kịch bản sang Markdown với metadata header.
   *
   * Thêm YAML-style frontmatter chứa thông tin:
   * - Tiêu đề, loại nội dung, track, persona
   * - Số từ, ngày tạo
   *
   * Giữ nguyên format Markdown gốc.
   * Thêm footer với thông tin tạo nội dung.
   */
  toMarkdown(content, metadata) {
    const contentTypeLabel = CONTENT_TYPE_LABELS[metadata.contentType] ?? metadata.contentType;
    const trackLabel = TRACK_LABELS[metadata.track] ?? metadata.track;
    const personaLabel = PERSONA_LABELS[metadata.persona] ?? metadata.persona;
    const formattedDate = formatVietnameseDate(metadata.createdAt);
    const estimatedDuration = vietnameseNLP.estimateDuration(content);
    const durationFormatted = vietnameseNLP.formatDuration(estimatedDuration);
    const header = `---
Tiêu đề: ${metadata.title}
Loại nội dung: ${contentTypeLabel}
Track: ${trackLabel}
Persona: ${personaLabel}
Số từ: ${metadata.wordCount}
Thời lượng ước tính: ${durationFormatted}
Ngày tạo: ${formattedDate}
---

# ${metadata.title}

`;
    const footer = `

---

*Kịch bản được tạo bởi GEM Content Control Center*
*${contentTypeLabel} | ${trackLabel} | ${personaLabel}*
*${metadata.wordCount} từ | ${durationFormatted}*
*Ngày tạo: ${formattedDate}*
`;
    return header + content + footer;
  },
  /**
   * Chuyển đổi kịch bản sang plain text (dùng cho clipboard).
   *
   * Loại bỏ tất cả format Markdown:
   * - Heading markers (##, ###)
   * - Bold/italic markers (**, __, *)
   * - Link syntax
   * - Code blocks
   * - Horizontal rules
   *
   * Giữ lại nội dung text thuần.
   */
  toPlainText(content) {
    let text = vietnameseNLP.stripMarkdown(content);
    text = text.split("\n").map((line) => line.trim()).join("\n");
    text = text.replace(/\n{3,}/g, "\n\n");
    return text.trim();
  },
  /**
   * Chuyển đổi sang định dạng teleprompter.
   *
   * Tối ưu cho đọc trước camera:
   * - Loại bỏ Markdown formatting
   * - Thêm dấu >>> giữa các đoạn (dễ nhận biết điểm dừng)
   * - Loại bỏ section headers và labels
   * - Viết hoa các phần nhấn mạnh
   * - Khoảng cách lớn giữa các đoạn
   */
  toTeleprompter(content) {
    let processed = content;
    for (const pattern of EMPHASIS_PATTERNS) {
      processed = processed.replace(pattern, (_match, captured) => {
        return captured.toUpperCase();
      });
    }
    let teleprompterText = vietnameseNLP.toTeleprompterText(processed);
    teleprompterText = teleprompterText.replace(
      /^\s*(\d+\.\s*|\[\w\]\s*)/gm,
      ""
    );
    teleprompterText = teleprompterText.replace(
      /\n\n+/g,
      `

${TELEPROMPTER_SEPARATOR}

`
    );
    teleprompterText = teleprompterText.replace(
      new RegExp(`(${TELEPROMPTER_SEPARATOR}\\s*){2,}`, "g"),
      `${TELEPROMPTER_SEPARATOR}

`
    );
    return teleprompterText.trim();
  },
  /**
   * Copy text vào clipboard.
   *
   * Sử dụng Clipboard API hiện đại (navigator.clipboard).
   * Fallback: tạo textarea ẩn + execCommand('copy') cho trình duyệt cũ.
   *
   * @returns true nếu copy thành công, false nếu thất bại.
   */
  async copyToClipboard(text) {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
      }
    }
    if (typeof document !== "undefined") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);
        return success;
      } catch {
        return false;
      }
    }
    return false;
  },
  /**
   * Tạo tên file cho xuất nội dung.
   *
   * Format: {sanitized-title}_{date}.{extension}
   * Ví dụ: "tu-duy-tan-so-tien-bac_2026-03-03.md"
   *
   * @param title - Tiêu đề gốc (có dấu tiếng Việt)
   * @param format - Định dạng file: 'md' | 'txt' | 'teleprompter.txt'
   */
  generateFilename(title, format) {
    const sanitized = sanitizeFilename(title);
    const dateStr = formatDateForFilename((/* @__PURE__ */ new Date()).toISOString());
    let extension;
    switch (format) {
      case "md":
      case "markdown":
        extension = "md";
        break;
      case "teleprompter":
      case "teleprompter.txt":
        extension = "teleprompter.txt";
        break;
      case "txt":
      case "text":
      default:
        extension = "txt";
        break;
    }
    const baseName = sanitized || "kich-ban";
    return `${baseName}_${dateStr}.${extension}`;
  },
  /**
   * Tải file xuống máy người dùng.
   *
   * Tạo Blob từ nội dung, tạo URL tạm thời,
   * trigger download qua thẻ <a>, và dọn dẹp.
   *
   * @param content - Nội dung file
   * @param filename - Tên file (đã sanitize)
   * @param mimeType - MIME type (ví dụ: 'text/markdown', 'text/plain')
   */
  downloadAsFile(content, filename, mimeType) {
    if (typeof document === "undefined" || typeof URL === "undefined") {
      return;
    }
    const bom = "\uFEFF";
    const blob = new Blob([bom + content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  },
  /**
   * Xuất kịch bản dưới dạng file Markdown và trigger download.
   */
  downloadAsMarkdown(content, metadata) {
    const markdown = exportService.toMarkdown(content, metadata);
    const filename = exportService.generateFilename(metadata.title, "md");
    exportService.downloadAsFile(markdown, filename, "text/markdown");
  },
  /**
   * Xuất kịch bản dưới dạng plain text và trigger download.
   */
  downloadAsText(content, title) {
    const plainText = exportService.toPlainText(content);
    const filename = exportService.generateFilename(title, "txt");
    exportService.downloadAsFile(plainText, filename, "text/plain");
  },
  /**
   * Xuất kịch bản dưới dạng teleprompter và trigger download.
   */
  downloadAsTeleprompter(content, title) {
    const teleprompter = exportService.toTeleprompter(content);
    const filename = exportService.generateFilename(title, "teleprompter.txt");
    exportService.downloadAsFile(teleprompter, filename, "text/plain");
  }
};

function buildFacebookPrompt(scriptTitle, scriptBody, track) {
  return `Bạn là chuyên gia content marketing cho kênh "Jennie Uyen Chu — Thức Tỉnh Tâm Thức".

Từ kịch bản YouTube dưới đây, tạo 5 bài Facebook Posts với 5 góc tiếp cận khác nhau.

## Kịch Bản Gốc
Tiêu đề: ${scriptTitle}
Track: ${track}
---
${scriptBody.slice(0, 3e3)}
---

## Yêu cầu:
- Mỗi bài từ 150-300 từ
- Tiếng Việt thuần túy, không dùng từ tiếng Anh
- 5 góc tiếp cận: (1) Câu hỏi gây tò mò, (2) Chia sẻ insight, (3) Câu chuyện cá nhân, (4) Data/số liệu, (5) Truyền cảm hứng
- Mỗi bài có 3-5 hashtags phù hợp
- Không dùng bullet points, viết văn xuôi
- CTA nhẹ nhàng: "Xem full video trên kênh YouTube" hoặc tương tự
- Không nhắc giá sản phẩm

Trả về JSON array:
[{"angle":"...", "content":"...", "hashtags":["..."]}]`;
}
function buildEmailPrompt(scriptTitle, scriptBody, track) {
  return `Bạn là chuyên gia email marketing cho "Jennie Uyen Chu — Thức Tỉnh Tâm Thức".

Từ kịch bản YouTube, tạo 3 email sequence: nurture → value → CTA.

## Kịch Bản Gốc
Tiêu đề: ${scriptTitle}
Track: ${track}
---
${scriptBody.slice(0, 3e3)}
---

## 3 Email:
1. **Nurture** (Ngày 1): Chia sẻ 1 insight từ video, tạo connection, không bán hàng
2. **Value** (Ngày 3): Deep dive vào 1 concept, cung cấp giá trị thực, gợi mở
3. **CTA** (Ngày 7): Kết nối pain point → solution, CTA khóa học/app

## Yêu cầu:
- Subject line hấp dẫn (< 60 ký tự)
- Preheader text (< 90 ký tự)
- Tiếng Việt thuần túy
- Văn phong thân mật, gần gũi
- Mỗi email 200-400 từ

Trả về JSON array:
[{"type":"nurture|value|cta", "subject":"...", "preheader":"...", "body":"...", "timing":"Ngày X", "ctaText":"...", "ctaUrl":"..."}]`;
}
function buildClipsPrompt(scriptTitle, scriptBody) {
  return `Bạn là chuyên gia short-form content cho "Jennie Uyen Chu".

Từ kịch bản YouTube dài, trích xuất 4 đoạn ngắn phù hợp TikTok/Reels/Shorts (30-60 giây mỗi clip).

## Kịch Bản Gốc
Tiêu đề: ${scriptTitle}
---
${scriptBody.slice(0, 4e3)}
---

## Yêu cầu mỗi clip:
- Hook mạnh (câu đầu gây chú ý)
- Nội dung 80-150 từ (30-60 giây)
- CTA ngắn: "Follow để xem thêm" / "Link ở bio"
- Gợi ý vị trí trong kịch bản gốc (timestamp hint)
- Chọn 4 khoảnh khắc hay nhất: insight sâu, moment gây bất ngờ, data thú vị, câu quote đáng nhớ

Trả về JSON array:
[{"title":"...", "hook":"...", "body":"...", "cta":"...", "wordCount":120, "estimatedDuration":45, "timestampHint":"Phần 3 - khoảng phút 12"}]`;
}
function buildLandingPrompt(scriptTitle, scriptBody, track) {
  return `Bạn là copywriter cho landing page "Jennie Uyen Chu".

Từ kịch bản YouTube, tạo copy cho 1 landing page quảng bá khóa học/sản phẩm liên quan.

## Kịch Bản Gốc
Tiêu đề: ${scriptTitle}
Track: ${track}
---
${scriptBody.slice(0, 3e3)}
---

## Cấu trúc landing page:
- Headline: 1 câu mạnh, gây tò mò (< 15 từ)
- Subheadline: Giải thích benefit chính (< 25 từ)
- 3-4 Pain Points mà đối tượng gặp phải
- 4-5 Benefits của giải pháp
- Gợi ý testimonial prompt
- CTA button text + subtext
- Urgency line (khan hiếm, thời gian)

## Yêu cầu:
- Tiếng Việt thuần túy
- Không nói giá cụ thể
- Tập trung transformation, không feature
- Kết nối tần số & nghiệp lực (USP Jennie)

Trả về JSON:
{"headline":"...", "subheadline":"...", "painPoints":["..."], "benefits":["..."], "testimonialPrompt":"...", "ctaText":"...", "ctaSubtext":"...", "urgencyLine":"..."}`;
}
function buildQuestionsPrompt(scriptTitle, scriptBody) {
  return `Bạn là community manager cho "Jennie Uyen Chu — Thức Tỉnh Tâm Thức".

Từ kịch bản YouTube, tạo 2 câu hỏi cho community (Facebook Group, YouTube Community tab).

## Kịch Bản Gốc
Tiêu đề: ${scriptTitle}
---
${scriptBody.slice(0, 2e3)}
---

## Yêu cầu:
- Câu hỏi mở, khuyến khích chia sẻ trải nghiệm
- Gợi ý 2-3 câu trả lời mẫu (để kích hoạt thảo luận)
- Có engagement hook (poll, emoji vote, tag bạn bè)
- Kết nối với nội dung video

Trả về JSON array:
[{"question":"...", "context":"...", "engagementHook":"...", "expectedResponses":["..."]}]`;
}
function safeParseJSON$1(text, fallback) {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return fallback;
  } catch {
    return fallback;
  }
}
const repurposeEngine = {
  async repurpose(params) {
    const {
      scriptId,
      scriptTitle,
      scriptBody,
      track,
      targets,
      onProgress
    } = params;
    const result = {
      scriptId,
      scriptTitle,
      totalItems: 0,
      completedTargets: [],
      failedTargets: [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const systemPrompt = buildSystemPrompt$1({
      contentType: "latc",
      track,
      persona: "jennie_educator",
      writingMode: "mode_1_calm",
      pillar: "lifestyle"
    });
    for (const target of targets) {
      onProgress?.(target, "generating");
      try {
        switch (target) {
          case "facebook_posts": {
            const prompt = buildFacebookPrompt(scriptTitle, scriptBody, track);
            const response = await claudeService.generate({
              systemPrompt,
              userPrompt: prompt,
              maxTokens: 4096,
              temperature: 0.8
            });
            const posts = safeParseJSON$1(response.content, []);
            result.facebookPosts = posts.map((p) => ({
              ...p,
              charCount: p.content?.length ?? 0,
              platform: "facebook"
            }));
            result.totalItems += result.facebookPosts.length;
            break;
          }
          case "email_sequence": {
            const prompt = buildEmailPrompt(scriptTitle, scriptBody, track);
            const response = await claudeService.generate({
              systemPrompt,
              userPrompt: prompt,
              maxTokens: 4096,
              temperature: 0.7
            });
            result.emails = safeParseJSON$1(response.content, []);
            result.totalItems += result.emails.length;
            break;
          }
          case "short_clips": {
            const prompt = buildClipsPrompt(scriptTitle, scriptBody);
            const response = await claudeService.generate({
              systemPrompt,
              userPrompt: prompt,
              maxTokens: 3072,
              temperature: 0.7
            });
            result.clips = safeParseJSON$1(response.content, []);
            result.totalItems += result.clips.length;
            break;
          }
          case "landing_page": {
            const prompt = buildLandingPrompt(scriptTitle, scriptBody, track);
            const response = await claudeService.generate({
              systemPrompt,
              userPrompt: prompt,
              maxTokens: 2048,
              temperature: 0.7
            });
            result.landingPage = safeParseJSON$1(response.content, {
              headline: "",
              subheadline: "",
              painPoints: [],
              benefits: [],
              testimonialPrompt: "",
              ctaText: "",
              ctaSubtext: "",
              urgencyLine: ""
            });
            result.totalItems += 1;
            break;
          }
          case "community_questions": {
            const prompt = buildQuestionsPrompt(scriptTitle, scriptBody);
            const response = await claudeService.generate({
              systemPrompt,
              userPrompt: prompt,
              maxTokens: 2048,
              temperature: 0.8
            });
            result.questions = safeParseJSON$1(response.content, []);
            result.totalItems += result.questions.length;
            break;
          }
        }
        result.completedTargets.push(target);
        onProgress?.(target, "done");
      } catch {
        result.failedTargets.push(target);
        onProgress?.(target, "error");
      }
    }
    const allText = [
      ...result.facebookPosts?.map((p) => p.content) ?? [],
      ...result.emails?.map((e) => e.body) ?? [],
      ...result.clips?.map((c) => `${c.hook} ${c.body}`) ?? [],
      result.landingPage ? `${result.landingPage.headline} ${result.landingPage.subheadline}` : "",
      ...result.questions?.map((q) => q.question) ?? []
    ].filter(Boolean).join("\n\n");
    if (allText) {
      const checkResult = brandVoiceChecker.check(allText, "latc");
      result.brandVoiceScore = checkResult.score;
    }
    return result;
  },
  getTargetLabel(target) {
    const labels = {
      facebook_posts: "5 Facebook Posts",
      email_sequence: "3 Email Sequences",
      short_clips: "4 Short Clips",
      landing_page: "1 Landing Page",
      community_questions: "2 Community Questions"
    };
    return labels[target];
  },
  getTargetDescription(target) {
    const descriptions = {
      facebook_posts: "5 góc tiếp cận khác nhau từ kịch bản gốc",
      email_sequence: "Chuỗi email: nurture → value → CTA (Ngày 1, 3, 7)",
      short_clips: "4 khoảnh khắc hay nhất, 30-60 giây mỗi clip",
      landing_page: "Copy landing page với headline, benefits, CTA",
      community_questions: "2 câu hỏi cho Facebook Group/YouTube Community"
    };
    return descriptions[target];
  },
  getAllTargets() {
    return ["facebook_posts", "email_sequence", "short_clips", "landing_page", "community_questions"];
  }
};

const FUNNELS = [
  {
    name: "Wealth Funnel",
    track: "wealth",
    color: "#d4a853",
    description: "Từ Drama Content → Scanner → Khóa học Trading",
    conversionNote: "TIER 2 có 78% lựa chọn — sweet spot pricing",
    steps: [
      { step: 1, product: "Drama Content", cta: "Organic reach", conversionRate: 100 },
      { step: 2, product: "Scanner Free Trial", price: "Miễn phí", cta: "Soft invite", conversionRate: 35 },
      { step: 3, product: "GEM Trading Starter", price: "299K", cta: "Problem-Solution", conversionRate: 18 },
      { step: 4, product: "TIER 1", price: "11M", cta: "Transformation", conversionRate: 8 },
      { step: 5, product: "TIER 2", price: "21M", cta: "Social proof + Urgency", conversionRate: 6.2 },
      { step: 6, product: "TIER 3", price: "68M", cta: "Legacy + Vision", conversionRate: 1.5 }
    ]
  },
  {
    name: "Wellness Funnel",
    track: "wellness",
    color: "#9b6dff",
    description: "Từ Tâm Thức Content → App → Khóa Healing",
    steps: [
      { step: 1, product: "Tâm Thức Content", cta: "Organic reach", conversionRate: 100 },
      { step: 2, product: "App Free", price: "Miễn phí", cta: "Value", conversionRate: 42 },
      { step: 3, product: "Tần Số Tình Yêu", price: "399K", cta: "Story", conversionRate: 22 },
      { step: 4, product: "7 Ngày Khai Mở", price: "1.99M", cta: "Transformation", conversionRate: 9 },
      { step: 5, product: "Crystals Shopify", price: "Varies", cta: "Lifestyle", conversionRate: 5 }
    ]
  },
  {
    name: "Integration Funnel",
    track: "integration",
    color: "#10B981",
    description: "Từ Bridge Content → App → Khóa Tư Duy — Best Conversion",
    conversionNote: "Integration track có tỷ lệ chuyển đổi cao nhất",
    steps: [
      { step: 1, product: "Bridge Content", cta: "Organic reach", conversionRate: 100 },
      { step: 2, product: "App Free", price: "Miễn phí", cta: "Question", conversionRate: 45 },
      { step: 3, product: "Tư Duy Triệu Phú", price: "499K / 1.99M", cta: "Before/After", conversionRate: 25 },
      { step: 4, product: "TIER 2", price: "21M", cta: "Legacy + Vision", conversionRate: 7 },
      { step: 5, product: "Crystals + Community", price: "Varies", cta: "Belonging", conversionRate: 4 }
    ]
  }
];
const CTA_PATTERNS = [
  { id: 1, name: "Soft Invite", example: "Nếu bạn muốn tìm hiểu sâu hơn...", track: "all" },
  { id: 2, name: "Problem-Solution", example: "Nếu bạn đang mắc kẹt trong...thì đây là giải pháp", track: "all" },
  { id: 3, name: "Transformation", example: "Từ [trước] → [sau] chỉ trong 7 ngày", track: "all" },
  { id: 4, name: "Social Proof", example: "2.847 học viên đã thay đổi...", track: "wealth" },
  { id: 5, name: "Urgency", example: "Chỉ còn 48 giờ để đăng ký...", track: "wealth" },
  { id: 6, name: "Question Hook", example: "Bạn có muốn biết bí mật mà...?", track: "all" },
  { id: 7, name: "Story Bridge", example: "Câu chuyện của Hương bắt đầu giống bạn...", track: "wellness" },
  { id: 8, name: "Data Point", example: "93% người áp dụng thấy kết quả trong 30 ngày", track: "wealth" },
  { id: 9, name: "Before/After", example: "Trước khi học: lo lắng. Sau: tự tin với mỗi quyết định", track: "integration" },
  { id: 10, name: "Legacy", example: "Đây không chỉ là đầu tư cho bạn, mà cho con cháu bạn", track: "integration" },
  { id: 11, name: "Fear of Missing", example: "Mỗi ngày không hành động là một ngày bạn mất...", track: "wealth" },
  { id: 12, name: "Vision Paint", example: "Hãy tưởng tượng 6 tháng sau...", track: "all" },
  { id: 13, name: "Community", example: "Tham gia cộng đồng 10.000+ người cùng tần số", track: "wellness" },
  { id: 14, name: "Expert Authority", example: "Với 8 năm kinh nghiệm và 277K subscribers...", track: "all" },
  { id: 15, name: "Risk Reversal", example: "Nếu không hài lòng, hoàn tiền 100% trong 7 ngày", track: "wealth" },
  { id: 16, name: "Curiosity Gap", example: "Có 1 điều mà 95% trader không biết...", track: "wealth" },
  { id: 17, name: "Value Stack", example: "Bạn nhận được: Scanner + Cộng đồng + Mentor...", track: "wealth" },
  { id: 18, name: "Emotional", example: "Bạn xứng đáng được sống với tần số cao nhất", track: "wellness" },
  { id: 19, name: "Challenge", example: "Thử 7 ngày, nếu không thay đổi, tôi chịu trách nhiệm", track: "integration" },
  { id: 20, name: "Exclusive", example: "Chỉ dành cho những ai thực sự sẵn sàng thay đổi", track: "all" },
  { id: 21, name: "Frequency Bridge", example: "Khi tần số bạn thay đổi, mọi thứ xung quanh cũng thay đổi", track: "wellness" },
  { id: 22, name: "Karma Connect", example: "Nghiệp lực không phải là số phận — bạn có thể chuyển hóa", track: "wellness" },
  { id: 23, name: "Tool Demo", example: "Scanner vừa phát hiện 3 tín hiệu mà...", track: "wealth" },
  { id: 24, name: "Milestone", example: "Bước đầu tiên luôn là bước khó nhất. Hãy bắt đầu hôm nay", track: "all" },
  { id: 25, name: "Comparison", example: "Giá 1 ly cà phê mỗi ngày = trọn bộ kiến thức...", track: "wealth" },
  { id: 26, name: "Deadline", example: "Ưu đãi kết thúc vào [ngày]. Sau đó giá sẽ...", track: "wealth" },
  { id: 27, name: "Bio Link", example: "Link ở bio — bấm ngay khi còn slot", track: "all" },
  { id: 28, name: "Comment Trigger", example: 'Comment "SẴN SÀNG" để nhận link đăng ký', track: "all" },
  { id: 29, name: "DM Invite", example: 'Nhắn tin "KHOÁ HỌC" để được tư vấn riêng', track: "all" },
  { id: 30, name: "Gentle Close", example: "Dù bạn chọn gì, hãy nhớ: bạn xứng đáng nhiều hơn thế", track: "wellness" }
];
const ctaRulesEngine = {
  validateScript(body, contentType) {
    const validations = [];
    const closingIndex = body.toLowerCase().indexOf("lời nhắn");
    const ctaIndex = body.toLowerCase().indexOf("khóa học");
    if (closingIndex > 0 && ctaIndex > closingIndex) {
      validations.push({
        rule: "CTA khóa học phải đặt TRƯỚC phần closing",
        severity: "critical",
        passed: false,
        suggestion: 'Di chuyển phần CTA lên trước "Lời nhắn touching"'
      });
    } else {
      validations.push({
        rule: "CTA khóa học TRƯỚC closing",
        severity: "critical",
        passed: true
      });
    }
    if (/tải.*tài liệu|download.*pdf|link.*document/i.test(body)) {
      validations.push({
        rule: "KHÔNG được CTA tải tài liệu tóm tắt",
        severity: "critical",
        passed: false,
        suggestion: "Thay bằng CTA app download hoặc khóa học"
      });
    } else {
      validations.push({
        rule: "Không CTA tài liệu",
        severity: "critical",
        passed: true
      });
    }
    if (contentType === "short_clip" && /\d+K|\d+M|giá|chi phí|phí/i.test(body)) {
      validations.push({
        rule: "CTA Khéo Léo: KHÔNG nói giá trong video ngắn",
        severity: "high",
        passed: false,
        suggestion: 'Chỉ gợi mở benefit: "Link ở bio" hoặc "Comment để nhận"'
      });
    } else {
      validations.push({
        rule: "Không nói giá trong video ngắn",
        severity: "high",
        passed: true
      });
    }
    const productMentions = body.match(/khóa học|scanner|app|tier|tần số tình yêu|khai mở|tư duy triệu phú|crystals/gi) ?? [];
    const uniqueProducts = new Set(productMentions.map((m) => m.toLowerCase()));
    if (uniqueProducts.size > 3) {
      validations.push({
        rule: "Tối đa 3 sản phẩm mỗi kịch bản",
        severity: "medium",
        passed: false,
        suggestion: `Đang nhắc ${uniqueProducts.size} sản phẩm, giảm xuống 3`
      });
    } else {
      validations.push({
        rule: "Tối đa 3 sản phẩm mỗi kịch bản",
        severity: "medium",
        passed: true
      });
    }
    const firstLine = body.split("\n")[0] ?? "";
    if (/scanner|tier|khóa học|app gem/i.test(firstLine)) {
      validations.push({
        rule: "Sản phẩm KHÔNG trong tiêu đề",
        severity: "critical",
        passed: false,
        suggestion: "Ưu tiên giáo dục, share value trước khi mention sản phẩm"
      });
    } else {
      validations.push({
        rule: "Sản phẩm không trong tiêu đề",
        severity: "critical",
        passed: true
      });
    }
    if (!/link|đăng ký|tham gia|comment|nhắn tin|bio/i.test(body)) {
      validations.push({
        rule: "Kịch bản phải có ít nhất 1 CTA",
        severity: "high",
        passed: false,
        suggestion: 'Thêm CTA: "Link ở bio", "Comment để nhận", hoặc "Đăng ký ngay"'
      });
    } else {
      validations.push({
        rule: "Kịch bản có CTA",
        severity: "high",
        passed: true
      });
    }
    return validations;
  },
  getRecommendedCTA(track) {
    const funnel = FUNNELS.find((f) => f.track === track) ?? FUNNELS[2];
    const patterns = CTA_PATTERNS.filter((p) => p.track === "all" || p.track === track).slice(0, 5).map((p) => p.name);
    return {
      track: funnel.track,
      steps: funnel.steps,
      patterns
    };
  },
  getFunnelByTrack(track) {
    return FUNNELS.find((f) => f.track === track);
  },
  getPatternsByTrack(track) {
    return CTA_PATTERNS.filter((p) => p.track === "all" || p.track === track);
  },
  getAllFunnels() {
    return FUNNELS;
  },
  getAllPatterns() {
    return CTA_PATTERNS;
  }
};

const QUEUE_KEY = "gem_offline_queue";
const syncService = {
  offlineQueue: [],
  /**
   * Queue an action for sync (used when offline)
   */
  async queueAction(action) {
    const queuedAction = {
      ...action,
      id: crypto.randomUUID(),
      queued_at: Date.now()
    };
    if (typeof navigator !== "undefined" && navigator.onLine) {
      await this.executeAction(queuedAction);
    } else {
      this.offlineQueue.push(queuedAction);
      await this.persistQueue();
    }
  },
  /**
   * Execute a single queued action against Supabase
   */
  async executeAction(action) {
    const supabase = getSupabase();
    const table = this.getTableName(action.entity_type);
    const from = (t) => supabase.from(t);
    switch (action.action) {
      case "create": {
        const { error } = await from(table).insert(action.payload);
        if (error) throw error;
        break;
      }
      case "update": {
        const { error } = await from(table).update({ ...action.payload, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", action.entity_id);
        if (error) throw error;
        break;
      }
      case "delete": {
        const { error } = await from(table).delete().eq("id", action.entity_id);
        if (error) throw error;
        break;
      }
    }
  },
  /**
   * Sync all queued actions when coming back online
   */
  async syncOnReconnect() {
    const queue = await this.loadQueue();
    const results = {
      success: 0,
      failed: 0,
      conflicts: [],
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    for (const action of queue) {
      try {
        if (action.action === "update") {
          const current = await this.fetchCurrent(action.entity_type, action.entity_id);
          if (current) {
            const serverUpdatedAt = new Date(current.updated_at).getTime();
            if (serverUpdatedAt > action.queued_at) {
              results.conflicts.push({
                action,
                serverVersion: current,
                resolution: "Phiên bản máy chủ mới hơn. Giữ phiên bản nào?"
              });
              continue;
            }
          }
        }
        await this.executeAction(action);
        results.success++;
      } catch {
        results.failed++;
      }
    }
    this.offlineQueue = [];
    await this.persistQueue();
    return results;
  },
  /**
   * Fetch current version from server for conflict detection
   */
  async fetchCurrent(entityType, entityId) {
    const table = this.getTableName(entityType);
    const { data } = await getSupabase().from(table).select("*").eq("id", entityId).single();
    return data;
  },
  /**
   * Subscribe to realtime changes for a table
   */
  subscribeToChanges(entityType, callback) {
    const table = this.getTableName(entityType);
    const channel = getSupabase().channel(`sync-${table}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      (payload) => {
        callback(payload);
      }
    ).subscribe();
    return {
      unsubscribe: () => {
        channel.unsubscribe();
      }
    };
  },
  /**
   * Setup online/offline listeners
   */
  setupConnectionListeners(onSync) {
    if (typeof window === "undefined") return () => {
    };
    const handleOnline = async () => {
      if (this.offlineQueue.length > 0) {
        const result = await this.syncOnReconnect();
        onSync(result);
      }
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  },
  /**
   * Get queue length
   */
  getQueueLength() {
    return this.offlineQueue.length;
  },
  /**
   * Check if online
   */
  isOnline() {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine;
  },
  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------
  getTableName(entityType) {
    const tableMap = {
      script: "cc_scripts",
      calendar_event: "cc_calendar_events",
      social_post: "cc_social_posts",
      title: "cc_titles",
      image_prompt: "cc_image_prompts"
    };
    return tableMap[entityType];
  },
  async persistQueue() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.offlineQueue));
    }
  },
  async loadQueue() {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    }
    return this.offlineQueue;
  }
};

const onboardingSteps = {
  dashboard: [
    {
      target: ".stat-cards",
      title: "Bảng Điều Khiển",
      body: "4 chỉ số quan trọng nhất: kịch bản tạo, đang chờ, tỷ lệ hoàn thành, và thời gian trung bình.",
      position: "bottom"
    },
    {
      target: ".content-pillars",
      title: "4 Trụ Cột → 3 Track",
      body: "Phân bổ nội dung: Wealth 30%, Wellness 30%, Integration 40%. Đảm bảo cân bằng giữa các track.",
      position: "right"
    },
    {
      target: ".quick-actions",
      title: "Hành Động Nhanh",
      body: "Tạo nội dung mới chỉ với 1 click. Chọn loại nội dung và bắt đầu ngay.",
      position: "top"
    }
  ],
  "ai-gen": [
    {
      target: ".content-type-select",
      title: "Loại Nội Dung",
      body: "Chọn LATC (dài), TMT (drama), Short Clip, Social Post, hoặc Image Prompt.",
      position: "bottom"
    },
    {
      target: ".persona-select",
      title: "7 Persona",
      body: "Mỗi persona có ngôn ngữ và pain point riêng. Gen Z Trader cần số liệu, Spiritual Seeker cần tần số.",
      position: "right"
    },
    {
      target: ".writing-mode",
      title: "Phong Cách Viết",
      body: "MODE 1: Trầm Tĩnh Thủ Thỉ — Sang, Thấm, Sâu. MODE 2: Đanh Thép Provocative — Brutal Honesty.",
      position: "bottom"
    },
    {
      target: ".generate-btn",
      title: "Tạo Nội Dung",
      body: "AI sẽ tự đọc framework, brand voice rules, và tạo kịch bản đầy đủ tuân thủ 10 Quy Tắc Vàng.",
      position: "left"
    }
  ],
  latc: [
    {
      target: ".structure-section",
      title: "Cấu Trúc LATC",
      body: "Hook + 5 Phần Chính + CTA + Closing = 4.000-5.500 từ, 20-35 phút.",
      position: "right"
    },
    {
      target: ".golden-rules",
      title: "10 Quy Tắc Vàng",
      body: "Mỗi kịch bản PHẢI tuân thủ 10 quy tắc: dual examples, prose flowing, GEM tools rải đều...",
      position: "left"
    },
    {
      target: ".gem-tools-map",
      title: "GEM Tools Mapping",
      body: "Rải công cụ đều trong 5 phần, KHÔNG dồn cuối. Scanner, Whale Tracker, Backtesting...",
      position: "bottom"
    }
  ],
  tmt: [
    {
      target: ".tmt-structure",
      title: "Cấu Trúc TMT",
      body: "9 phần: Intro → Tổng Quan → 4 Phần Chính → Climax → Closing → CTA 4 Lớp.",
      position: "right"
    },
    {
      target: ".emotional-arc",
      title: "Cung Cảm Xúc",
      body: "Từ nhẹ → nặng. Phần 1 tò mò, Phần 4 sốc, Climax cực điểm, Closing touching.",
      position: "bottom"
    }
  ],
  "short-clips": [
    {
      target: ".clip-timeline",
      title: "Timeline 5 Bước",
      body: "Hook (3s) → Context (5s) → Core (15-40s) → CTA (5s) → End Card (2s).",
      position: "bottom"
    },
    {
      target: ".platform-preview",
      title: "Preview Nền Tảng",
      body: "Xem trước clip trên TikTok, Instagram Reels, YouTube Shorts với kích thước thực.",
      position: "left"
    }
  ],
  "social-posts": [
    {
      target: ".campaign-grid",
      title: "Lịch 30 Ngày",
      body: "Lên lịch bài đăng cho 30 ngày. Tự động phân bổ theo track và persona.",
      position: "bottom"
    },
    {
      target: ".cta-patterns",
      title: "CTA Patterns",
      body: "30 mẫu CTA xoay vòng. Mỗi tuần dùng pattern khác nhau để tránh lặp.",
      position: "right"
    }
  ],
  thumbs: [
    {
      target: ".title-formulas",
      title: "Công Thức Tiêu Đề",
      body: "4 công thức LATC + 5 công thức TMT. Mỗi tiêu đề tối đa 65 ký tự.",
      position: "bottom"
    },
    {
      target: ".ab-variants",
      title: "A/B/C Variants",
      body: "Tạo 3 biến thể để test. So sánh CTR dự kiến và chọn tiêu đề tốt nhất.",
      position: "right"
    }
  ],
  "image-gen": [
    {
      target: ".category-tabs",
      title: "8 Danh Mục",
      body: "Thumbnail, Social Banner, Story, Quote Card, và nhiều loại khác.",
      position: "bottom"
    },
    {
      target: ".color-system",
      title: "Design System GEM",
      body: "Sử dụng bảng màu thương hiệu: Gold, Purple, Cyan, Emerald. Đảm bảo nhất quán.",
      position: "left"
    }
  ],
  calendar: [
    {
      target: ".calendar-grid",
      title: "Lịch Nội Dung",
      body: "Kéo thả sự kiện. Mon=Wealth, Wed=Wellness, Fri=Integration, Sun=Deep content.",
      position: "bottom"
    },
    {
      target: ".track-distribution",
      title: "Phân Bổ Track",
      body: "Theo dõi tỷ lệ Wealth 30% / Wellness 30% / Integration 40% mỗi tuần.",
      position: "right"
    }
  ],
  analytics: [
    {
      target: ".connect-yt",
      title: "Kết Nối YouTube",
      body: "Liên kết kênh YouTube để xem phân tích chi tiết về views, CTR, retention.",
      position: "bottom"
    },
    {
      target: ".ai-analysis",
      title: "AI Phân Tích",
      body: "Claude phân tích dữ liệu hàng tuần: top performers, content gaps, action plan.",
      position: "left"
    }
  ],
  repurpose: [
    {
      target: ".script-select",
      title: "Chọn Kịch Bản",
      body: "Chọn 1 kịch bản YouTube → tạo content cho 5 nền tảng khác nhau.",
      position: "bottom"
    },
    {
      target: ".target-select",
      title: "Chọn Đích",
      body: "5 Facebook Posts, 3 Email, 4 Short Clips, 1 Landing Page, 2 Community Questions.",
      position: "right"
    }
  ],
  funnels: [
    {
      target: ".funnel-tabs",
      title: "3 Phễu Chuyển Đổi",
      body: "Wealth (Trading), Wellness (Tâm Thức), Integration (Kết Hợp). Mỗi phễu có 4-6 bước.",
      position: "bottom"
    },
    {
      target: ".cta-rules",
      title: "Quy Tắc CTA",
      body: "CTA trước closing, không nói giá trong video, tối đa 3 sản phẩm mỗi kịch bản.",
      position: "left"
    }
  ],
  brand: [
    {
      target: ".golden-rules",
      title: "10 Quy Tắc Vàng",
      body: "Mọi nội dung PHẢI tuân thủ. Brand voice checker tự động kiểm tra.",
      position: "bottom"
    }
  ],
  settings: [
    {
      target: ".api-config",
      title: "Cấu Hình API",
      body: "Nhập Anthropic API Key, chọn model mặc định, điều chỉnh temperature.",
      position: "bottom"
    }
  ]
};
const onboardingService = {
  /**
   * Get steps for a specific screen
   */
  getSteps(screenId) {
    return onboardingSteps[screenId] ?? [];
  },
  /**
   * Check if user has completed onboarding for a screen
   */
  async isCompleted(userId, screenId) {
    const { data } = await getSupabase().from("profiles").select("onboarding_completed").eq("id", userId).single();
    const completed = data?.onboarding_completed;
    return completed?.[screenId] ?? false;
  },
  /**
   * Mark onboarding as completed for a screen
   */
  async markCompleted(userId, screenId) {
    const { data } = await getSupabase().from("profiles").select("onboarding_completed").eq("id", userId).single();
    const existing = data?.onboarding_completed ?? {};
    await getSupabase().from("profiles").update({
      onboarding_completed: { ...existing, [screenId]: true }
    }).eq("id", userId);
  },
  /**
   * Reset onboarding for a screen (replay)
   */
  async resetScreen(userId, screenId) {
    const { data } = await getSupabase().from("profiles").select("onboarding_completed").eq("id", userId).single();
    const existing = data?.onboarding_completed ?? {};
    delete existing[screenId];
    await getSupabase().from("profiles").update({ onboarding_completed: existing }).eq("id", userId);
  },
  /**
   * Reset all onboarding
   */
  async resetAll(userId) {
    await getSupabase().from("profiles").update({ onboarding_completed: {} }).eq("id", userId);
  },
  /**
   * Get all screen IDs
   */
  getAllScreenIds() {
    return Object.keys(onboardingSteps);
  }
};

const MODEL_HAIKU = "claude-haiku-4-5-20251001";
const MODEL_SONNET = "claude-sonnet-4-5-20250929";
const TASK_ROUTES = {
  // ─── FAST / CHEAP — Haiku ───
  // Các tác vụ nhẹ, cần phản hồi nhanh, chi phí thấp
  topic_analysis: {
    config: {
      model: MODEL_HAIKU,
      maxTokens: 500,
      temperature: 0.3,
      label: "Haiku — Phân tích chủ đề"
    },
    costLabel: "~$0.001",
    tier: "fast"
  },
  brand_check: {
    config: {
      model: MODEL_HAIKU,
      maxTokens: 1e3,
      temperature: 0.2,
      label: "Haiku — Kiểm tra brand voice"
    },
    costLabel: "~$0.002",
    tier: "fast"
  },
  title_generation: {
    config: {
      model: MODEL_HAIKU,
      maxTokens: 800,
      temperature: 0.8,
      label: "Haiku — Tạo tiêu đề"
    },
    costLabel: "~$0.001",
    tier: "fast"
  },
  term_conversion: {
    config: {
      model: MODEL_HAIKU,
      maxTokens: 500,
      temperature: 0.1,
      label: "Haiku — Chuyển đổi thuật ngữ"
    },
    costLabel: "~$0.001",
    tier: "fast"
  },
  // ─── MEDIUM — Sonnet (token vừa) ───
  // Các tác vụ cần chất lượng cao hơn nhưng không quá dài
  outline: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 2e3,
      temperature: 0.6,
      label: "Sonnet — Tạo outline"
    },
    costLabel: "~$0.01",
    tier: "medium"
  },
  social_post: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 1500,
      temperature: 0.7,
      label: "Sonnet — Bài mạng xã hội"
    },
    costLabel: "~$0.008",
    tier: "medium"
  },
  short_clip: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 1500,
      temperature: 0.75,
      label: "Sonnet — Script clip ngắn"
    },
    costLabel: "~$0.008",
    tier: "medium"
  },
  email_generation: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 2e3,
      temperature: 0.65,
      label: "Sonnet — Tạo email"
    },
    costLabel: "~$0.01",
    tier: "medium"
  },
  image_prompt: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 1e3,
      temperature: 0.7,
      label: "Sonnet — Prompt hình ảnh"
    },
    costLabel: "~$0.005",
    tier: "medium"
  },
  // ─── FULL POWER — Sonnet (token cao) ───
  // Các tác vụ nặng, cần output dài và chất lượng cao nhất
  full_script: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 8e3,
      temperature: 0.7,
      label: "Sonnet — Full script (LATC/TMT)"
    },
    costLabel: "~$0.05",
    tier: "full"
  },
  analytics_insight: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 4096,
      temperature: 0.5,
      label: "Sonnet — Phân tích analytics"
    },
    costLabel: "~$0.03",
    tier: "full"
  },
  repurpose: {
    config: {
      model: MODEL_SONNET,
      maxTokens: 6e3,
      temperature: 0.65,
      label: "Sonnet — Tái sử dụng nội dung"
    },
    costLabel: "~$0.04",
    tier: "full"
  }
};
const FALLBACK_DEFINITION = {
  config: {
    model: MODEL_SONNET,
    maxTokens: 4096,
    temperature: 0.7,
    label: "Sonnet — Mặc định"
  },
  costLabel: "~$0.02"};
function applyComplexity(base, complexity) {
  const c = Math.max(0, Math.min(1, complexity));
  if (c === 0) return base;
  const tokenMultiplier = 1 + c * 0.5;
  const adjustedMaxTokens = Math.round(base.maxTokens * tokenMultiplier);
  const temperatureAdjust = c * 0.05;
  const adjustedTemperature = Math.max(0.1, base.temperature - temperatureAdjust);
  return {
    ...base,
    maxTokens: adjustedMaxTokens,
    temperature: Number(adjustedTemperature.toFixed(2))
  };
}
const modelRouter = {
  /**
   * Chọn mô hình và cấu hình phù hợp cho một loại tác vụ.
   *
   * @param taskType - Loại tác vụ (vd: 'topic_analysis', 'full_script', 'outline')
   * @param complexity - Độ phức tạp tùy chọn (0-1), ảnh hưởng đến maxTokens và temperature
   * @returns ModelConfig với model ID, maxTokens, temperature, và label
   *
   * @example
   * ```ts
   * // Tác vụ nhanh — sử dụng Haiku
   * const config = modelRouter.selectModel('topic_analysis');
   * // → { model: 'claude-haiku-4-5-20251001', maxTokens: 500, ... }
   *
   * // Tác vụ nặng với complexity cao
   * const config = modelRouter.selectModel('full_script', 0.8);
   * // → { model: 'claude-sonnet-4-5-20250929', maxTokens: 12000, ... }
   * ```
   */
  selectModel(taskType, complexity) {
    const definition = TASK_ROUTES[taskType] ?? FALLBACK_DEFINITION;
    const base = { ...definition.config };
    if (complexity !== void 0 && complexity > 0) {
      return applyComplexity(base, complexity);
    }
    return base;
  },
  /**
   * Lấy danh sách tất cả cấu hình mô hình có sẵn.
   * Hữu ích để hiển thị trong UI hoặc debug.
   *
   * @returns Mảng ModelConfig cho mọi tác vụ đã đăng ký
   */
  getAvailableModels() {
    const seen = /* @__PURE__ */ new Set();
    const models = [];
    for (const definition of Object.values(TASK_ROUTES)) {
      const key = `${definition.config.model}:${definition.config.maxTokens}`;
      if (!seen.has(key)) {
        seen.add(key);
        models.push({ ...definition.config });
      }
    }
    return models;
  },
  /**
   * Ước tính chi phí cho một tác vụ.
   * Giá trị ước tính dựa trên token trung bình, chỉ mang tính tham khảo.
   *
   * @param taskType - Loại tác vụ cần ước tính chi phí
   * @returns Object chứa model được chọn và chi phí ước tính
   *
   * @example
   * ```ts
   * const cost = modelRouter.getCostEstimate('full_script');
   * // → { model: 'claude-sonnet-4-5-20250929', estimatedCost: '~$0.05' }
   * ```
   */
  getCostEstimate(taskType) {
    const definition = TASK_ROUTES[taskType] ?? FALLBACK_DEFINITION;
    return {
      model: definition.config.model,
      estimatedCost: definition.costLabel
    };
  },
  /**
   * Lấy danh sách tất cả loại tác vụ được hỗ trợ.
   * Hữu ích để validate input hoặc hiển thị dropdown trong UI.
   *
   * @returns Mảng tên tác vụ (vd: ['topic_analysis', 'brand_check', ...])
   */
  getTaskTypes() {
    return Object.keys(TASK_ROUTES);
  },
  /**
   * Lấy tier (fast/medium/full) của một tác vụ.
   * Hữu ích để hiển thị badge hoặc biểu tượng trong UI.
   *
   * @param taskType - Loại tác vụ cần tra cứu
   * @returns 'fast' | 'medium' | 'full'
   */
  getTaskTier(taskType) {
    const definition = TASK_ROUTES[taskType];
    return definition?.tier ?? "medium";
  },
  /**
   * Lấy tất cả tác vụ thuộc một tier cụ thể.
   *
   * @param tier - Tier cần lọc: 'fast', 'medium', hoặc 'full'
   * @returns Mảng tên tác vụ thuộc tier đó
   *
   * @example
   * ```ts
   * const fastTasks = modelRouter.getTasksByTier('fast');
   * // → ['topic_analysis', 'brand_check', 'title_generation', 'term_conversion']
   * ```
   */
  getTasksByTier(tier) {
    return Object.entries(TASK_ROUTES).filter(([, definition]) => definition.tier === tier).map(([taskType]) => taskType);
  }
};

const BRAND_SCORE_THRESHOLD = 85;
const FULL_PIPELINE_STEPS = 5;
const CLIP_PIPELINE_STEPS = 3;
function checkAbort(signal) {
  if (signal?.aborted) {
    throw new Error("Đã hủy pipeline tạo nội dung.");
  }
}
function safeParseJSON(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}
function parsePillar(raw) {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("spiritual") || lower.includes("tâm thức") || lower.includes("tâm linh")) {
    return "spiritual";
  }
  if (lower.includes("trading") || lower.includes("giao dịch")) {
    return "trading";
  }
  if (lower.includes("latc") || lower.includes("money") || lower.includes("tiền")) {
    return "latc_money";
  }
  return "lifestyle";
}
function parseTrack(raw) {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("wealth") || lower.includes("tài chính")) return "wealth";
  if (lower.includes("wellness") || lower.includes("tâm thức")) return "wellness";
  return "integration";
}
function parsePersona(raw) {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("mentor")) return "jennie_mentor";
  if (lower.includes("provocateur")) return "jennie_provocateur";
  if (lower.includes("storyteller")) return "jennie_storyteller";
  if (lower.includes("analyst")) return "jennie_analyst";
  if (lower.includes("motivator")) return "jennie_motivator";
  if (lower.includes("educator")) return "jennie_educator";
  if (lower.includes("confidante")) return "jennie_confidante";
  return "jennie_mentor";
}
async function stepTopicAnalysis(params) {
  checkAbort(params.signal);
  const config = modelRouter.selectModel("topic_analysis");
  const result = await claudeService.generate({
    systemPrompt: 'Bạn là chuyên gia phân tích nội dung cho kênh "Thức Tỉnh Tâm Thức" của Jennie Uyen Chu. Kênh kết hợp tài chính (crypto, trading) và tâm thức (thiền, năng lượng, tần số). Phân tích chủ đề và trả về JSON.',
    userPrompt: `Phân tích chủ đề sau cho kênh Jennie Uyen Chu:

CHỦ ĐỀ: "${params.topic}"
TRACK YÊU CẦU: ${params.track}
PERSONA YÊU CẦU: ${params.persona}
WRITING MODE: ${params.writingMode}

Trả về JSON (KHÔNG thêm text ngoài JSON):
{
  "pillar": "spiritual|trading|latc_money|lifestyle",
  "track": "wealth|wellness|integration",
  "suggestedPersona": "jennie_mentor|jennie_provocateur|...",
  "emotionalArc": "Mô tả cung cảm xúc: mở đầu → cao trào → kết",
  "keyTopics": ["keyword1", "keyword2", "keyword3"],
  "uniqueAngle": "Góc tiếp cận độc đáo cho chủ đề này"
}`,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    model: config.model,
    signal: params.signal
  });
  const defaultAnalysis = {
    pillar: "lifestyle",
    track: params.track,
    suggestedPersona: params.persona,
    emotionalArc: "Tò mò → Suy ngẫm → Giác ngộ → Hành động",
    keyTopics: [params.topic],
    uniqueAngle: "Kết nối tài chính và tâm thức qua lăng kính tần số"
  };
  const parsed = safeParseJSON(result.content, {});
  return {
    pillar: parsed.pillar ? parsePillar(parsed.pillar) : defaultAnalysis.pillar,
    track: parsed.track ? parseTrack(parsed.track) : defaultAnalysis.track,
    suggestedPersona: parsed.suggestedPersona ? parsePersona(parsed.suggestedPersona) : defaultAnalysis.suggestedPersona,
    emotionalArc: parsed.emotionalArc ?? defaultAnalysis.emotionalArc,
    keyTopics: Array.isArray(parsed.keyTopics) && parsed.keyTopics.length > 0 ? parsed.keyTopics : defaultAnalysis.keyTopics,
    uniqueAngle: parsed.uniqueAngle ?? defaultAnalysis.uniqueAngle
  };
}
async function stepOutlineGeneration(params, analysis, contentType) {
  checkAbort(params.signal);
  const config = modelRouter.selectModel("outline");
  const productHooksText = params.productHooks && params.productHooks.length > 0 ? `
SẢN PHẨM GEM CẦN NHẮC: ${params.productHooks.join(", ")}` : "";
  const structureGuide = contentType === "latc" ? "CẤU TRÚC LATC: Hook (500 từ) → 5 Phần chính (600-800 từ mỗi phần) → CTA (200-300 từ) → Closing (200 từ). Tổng: 4000-5500 từ." : "CẤU TRÚC TMT: Intro (300-400 từ) → Tổng quan (400-500 từ) → 4 Phần phân tích escalating (500-700 từ) → Climax (700-900 từ) → Closing (500-600 từ) → CTA 4 lớp (200-250 từ). Tổng: 4500-5500 từ.";
  const result = await claudeService.generate({
    systemPrompt: 'Bạn là chuyên gia lập dàn bài cho kênh "Thức Tỉnh Tâm Thức". Mỗi phần phải có dual examples (crypto + đời sống). GEM tools phải được rải đều, KHÔNG dồn cuối bài. Trả về JSON dàn bài chi tiết.',
    userPrompt: `Tạo outline chi tiết cho nội dung ${contentType.toUpperCase()}:

CHỦ ĐỀ: "${params.topic}"
PILLAR: ${analysis.pillar}
TRACK: ${analysis.track}
PERSONA: ${params.persona}
WRITING MODE: ${params.writingMode}
EMOTIONAL ARC: ${analysis.emotionalArc}
KEY TOPICS: ${analysis.keyTopics.join(", ")}
GÓC TIẾP CẬN: ${analysis.uniqueAngle}
${productHooksText}

${structureGuide}

Trả về JSON (KHÔNG thêm text ngoài JSON):
{
  "title": "Tiêu đề đề xuất (không chứa tên sản phẩm)",
  "sections": [
    {
      "heading": "Tên phần",
      "summary": "Tóm tắt nội dung 2-3 câu",
      "targetWordCount": 600,
      "cryptoExample": "Ví dụ crypto/tài chính cụ thể",
      "lifeExample": "Ví dụ đời sống/đời thường tương ứng"
    }
  ],
  "estimatedWordCount": 4500,
  "gemToolPlacements": ["Phần 1: GEM Scanner khi nói về...", "Phần 3: GEM Vision Board khi..."]
}`,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    model: config.model,
    signal: params.signal
  });
  const defaultOutline = {
    title: params.topic,
    sections: [
      {
        heading: "Hook",
        summary: "Mở đầu gây tò mò về chủ đề",
        targetWordCount: 500,
        cryptoExample: "Ví dụ từ thị trường crypto",
        lifeExample: "Ví dụ từ đời sống hàng ngày"
      }
    ],
    estimatedWordCount: contentType === "latc" ? 4500 : 5e3,
    gemToolPlacements: []
  };
  const parsed = safeParseJSON(result.content, {});
  return {
    title: parsed.title ?? defaultOutline.title,
    sections: Array.isArray(parsed.sections) && parsed.sections.length > 0 ? parsed.sections : defaultOutline.sections,
    estimatedWordCount: parsed.estimatedWordCount ?? defaultOutline.estimatedWordCount,
    gemToolPlacements: Array.isArray(parsed.gemToolPlacements) ? parsed.gemToolPlacements : defaultOutline.gemToolPlacements
  };
}
async function stepFullScriptGeneration(params, analysis, outline, contentType) {
  checkAbort(params.signal);
  const config = modelRouter.selectModel("full_script");
  const systemPrompt = buildSystemPrompt$1({
    contentType,
    persona: params.persona,
    writingMode: params.writingMode,
    track: analysis.track,
    pillar: analysis.pillar,
    productHooks: params.productHooks
  });
  const outlineText = outline.sections.map(
    (s, _i) => `## ${s.heading} (~${s.targetWordCount} từ)
Nội dung: ${s.summary}
Ví dụ crypto: ${s.cryptoExample}
Ví dụ đời sống: ${s.lifeExample}`
  ).join("\n\n");
  const gemPlacementsText = outline.gemToolPlacements.length > 0 ? `
VỊ TRÍ GEM TOOLS:
${outline.gemToolPlacements.join("\n")}` : "";
  const result = await claudeService.generate({
    systemPrompt,
    userPrompt: `Viết kịch bản ${contentType.toUpperCase()} hoàn chỉnh dựa trên outline sau:

TIÊU ĐỀ: ${outline.title}
EMOTIONAL ARC: ${analysis.emotionalArc}
GÓC TIẾP CẬN: ${analysis.uniqueAngle}
${gemPlacementsText}

OUTLINE CHI TIẾT:
${outlineText}

YÊU CẦU:
- Viết đầy đủ từng phần theo outline, KHÔNG tóm tắt.
- Mỗi phần chính phải có dual examples (crypto + đời sống).
- Dùng Markdown: ## cho phần chính.
- Câu ngắn, tối đa 15 từ/câu.
- 100% tiếng Việt có dấu. KHÔNG emoji.
- Tổng: ${outline.estimatedWordCount} từ.`,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    model: config.model,
    onStream: params.onStream,
    signal: params.signal
  });
  return result.content;
}
async function stepBrandVoiceCheck(params, script, contentType) {
  checkAbort(params.signal);
  const config = modelRouter.selectModel("brand_check");
  const result = await claudeService.generate({
    systemPrompt: 'Bạn là bot kiểm tra brand voice cho kênh "Thức Tỉnh Tâm Thức". Kiểm tra 10 Quy Tắc Vàng và chấm điểm 0-100. Trả về JSON.',
    userPrompt: `Kiểm tra nội dung ${contentType.toUpperCase()} sau theo 10 QUY TẮC VÀNG:

① DUAL EXAMPLES: Mỗi phần có cả ví dụ crypto VÀ đời sống?
② DẪN VÀO BỐI CẢNH: Có câu dẫn nhập trước ví dụ?
③ GEM TOOLS RẢI ĐỀU: GEM tools có rải đều hay dồn cuối?
④ TIẾNG VIỆT THUẦN TÚY: Có thuật ngữ tiếng Anh cần chuyển đổi?
⑤ PROSE FLOWING: Có dùng bullet points không?
⑥ TẦN SỐ LÀ TRUNG TÂM: Có nhắc tần số/nghiệp lực?
⑦ CTA TRƯỚC CLOSING: CTA đặt đúng vị trí?
⑧ GIÁO DỤC > BÁN HÀNG: Sản phẩm có xuất hiện trong tiêu đề?
⑨ TRANSITION PHRASES: Có câu chuyển tiếp giữa các phần?
⑩ CLOSING TOUCHING: Phần kết có nhẹ nhàng, ấm áp?

NỘI DUNG CẦN KIỂM TRA:
${script.substring(0, 6e3)}

Trả về JSON (KHÔNG thêm text ngoài JSON):
{
  "score": 87,
  "violations": [
    {
      "ruleNumber": 4,
      "ruleName": "TIẾNG VIỆT THUẦN TÚY",
      "description": "Tìm thấy 'mindset' chưa chuyển đổi",
      "fix": "Thay 'mindset' bằng 'tư duy'"
    }
  ],
  "passed": true
}`,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    model: config.model,
    signal: params.signal
  });
  const defaultCheck = {
    score: 80};
  const parsed = safeParseJSON(result.content, {});
  const score = typeof parsed.score === "number" ? Math.max(0, Math.min(100, parsed.score)) : defaultCheck.score;
  return {
    score,
    violations: Array.isArray(parsed.violations) ? parsed.violations : [],
    passed: score >= BRAND_SCORE_THRESHOLD
  };
}
async function stepPolishAndFix(params, script, brandCheck, contentType) {
  checkAbort(params.signal);
  const config = modelRouter.selectModel("full_script");
  const violationsList = brandCheck.violations.map(
    (v) => `- Quy tắc ${v.ruleNumber} (${v.ruleName}): ${v.description}
  → Sửa: ${v.fix}`
  ).join("\n");
  const systemPrompt = buildSystemPrompt$1({
    contentType,
    persona: params.persona,
    writingMode: params.writingMode,
    track: params.track,
    pillar: "lifestyle",
    // Mặc định — sẽ được override bởi nội dung đã có
    productHooks: params.productHooks
  });
  const result = await claudeService.generate({
    systemPrompt,
    userPrompt: `Kịch bản ${contentType.toUpperCase()} sau đạt ${brandCheck.score}/100 điểm brand voice.
Cần sửa các vi phạm sau:

${violationsList}

KỊCH BẢN CẦN SỬA:
${script}

YÊU CẦU:
- Sửa TẤT CẢ vi phạm được liệt kê ở trên.
- Giữ nguyên cấu trúc, tone, và nội dung tổng thể.
- KHÔNG thêm lời giải thích — chỉ trả về kịch bản đã sửa.
- Đảm bảo 100% tiếng Việt, câu ngắn, prose flowing, dual examples.
- Output: kịch bản hoàn chỉnh đã sửa lỗi.`,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    model: config.model,
    signal: params.signal
  });
  return result.content;
}
async function runFullPipeline(params, contentType) {
  const totalSteps = FULL_PIPELINE_STEPS;
  const stepDurations = [];
  let totalTokensEstimated = 0;
  const pipelineStart = Date.now();
  let stepStart = Date.now();
  const analysis = await stepTopicAnalysis(params);
  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 500;
  params.onStepComplete?.(1, totalSteps, "Phân tích chủ đề");
  stepStart = Date.now();
  const outline = await stepOutlineGeneration(params, analysis, contentType);
  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 2e3;
  params.onStepComplete?.(2, totalSteps, "Tạo dàn bài");
  stepStart = Date.now();
  const script = await stepFullScriptGeneration(
    params,
    analysis,
    outline,
    contentType
  );
  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 8e3;
  params.onStepComplete?.(3, totalSteps, "Viết kịch bản");
  stepStart = Date.now();
  const brandCheck = await stepBrandVoiceCheck(params, script, contentType);
  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 1e3;
  params.onStepComplete?.(4, totalSteps, "Kiểm tra brand voice");
  let finalScript = script;
  let wasPolished = false;
  if (!brandCheck.passed) {
    stepStart = Date.now();
    finalScript = await stepPolishAndFix(
      params,
      script,
      brandCheck,
      contentType
    );
    stepDurations.push(Date.now() - stepStart);
    totalTokensEstimated += 8e3;
    wasPolished = true;
    params.onStepComplete?.(5, totalSteps, "Polish & sửa lỗi");
  } else {
    stepDurations.push(0);
    params.onStepComplete?.(5, totalSteps, "Bỏ qua (score đạt chuẩn)");
  }
  return {
    content: finalScript,
    topicAnalysis: analysis,
    outline,
    brandCheck,
    wasPolished,
    pipelineStats: {
      totalDurationMs: Date.now() - pipelineStart,
      stepDurations,
      totalTokensEstimated,
      stepsCompleted: wasPolished ? 5 : 4
    }
  };
}
async function runClipPipeline(params) {
  const totalSteps = CLIP_PIPELINE_STEPS;
  const stepDurations = [];
  let totalTokensEstimated = 0;
  const pipelineStart = Date.now();
  let stepStart = Date.now();
  const analysis = await stepTopicAnalysis(params);
  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 500;
  params.onStepComplete?.(1, totalSteps, "Phân tích chủ đề");
  stepStart = Date.now();
  const outline = await stepOutlineGeneration(params, analysis, "short_clip");
  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 1e3;
  params.onStepComplete?.(2, totalSteps, "Tạo dàn bài clip");
  stepStart = Date.now();
  const clipConfig = modelRouter.selectModel("short_clip");
  const systemPrompt = buildSystemPrompt$1({
    contentType: "short_clip",
    persona: params.persona,
    writingMode: params.writingMode,
    track: analysis.track,
    pillar: analysis.pillar,
    productHooks: params.productHooks
  });
  const outlineText = outline.sections.map((s) => `- ${s.heading}: ${s.summary}`).join("\n");
  const result = await claudeService.generate({
    systemPrompt,
    userPrompt: `Viết kịch bản SHORT CLIP (75-200 từ, 30-70 giây) dựa trên:

CHỦ ĐỀ: "${params.topic}"
GÓC TIẾP CẬN: ${analysis.uniqueAngle}
OUTLINE:
${outlineText}

WRITING MODE: ${params.writingMode === "mode_1_calm" ? "Calm — 5 bước" : "Provocative — 7 bước"}

YÊU CẦU:
- 75-200 từ tổng cộng.
- Câu cực ngắn: 5-10 từ/câu.
- Mỗi câu 1 dòng.
- KHÔNG emoji.
- Dùng Markdown ### cho mỗi bước.`,
    maxTokens: clipConfig.maxTokens,
    temperature: clipConfig.temperature,
    model: clipConfig.model,
    onStream: params.onStream,
    signal: params.signal
  });
  stepDurations.push(Date.now() - stepStart);
  totalTokensEstimated += 1500;
  params.onStepComplete?.(3, totalSteps, "Viết kịch bản clip");
  const defaultBrandCheck = {
    score: 100,
    violations: [],
    passed: true
  };
  return {
    content: result.content,
    topicAnalysis: analysis,
    outline,
    brandCheck: defaultBrandCheck,
    wasPolished: false,
    pipelineStats: {
      totalDurationMs: Date.now() - pipelineStart,
      stepDurations,
      totalTokensEstimated,
      stepsCompleted: 3
    }
  };
}
const cascadingPipeline = {
  /**
   * Tạo kịch bản LATC qua pipeline 5 bước.
   *
   * Pipeline:
   *   1. Phân tích chủ đề (Haiku, ~1s)
   *   2. Tạo outline chi tiết (Sonnet, ~3s)
   *   3. Viết full script — có streaming (Sonnet, ~15s)
   *   4. Kiểm tra brand voice (Haiku, ~2s)
   *   5. Polish & sửa lỗi — chỉ khi score < 85 (Sonnet, ~10s)
   *
   * @param params - Cấu hình pipeline bao gồm topic, persona, callbacks
   * @returns CascadingResult với script, analysis, outline, brand check, và stats
   *
   * @example
   * ```ts
   * const result = await cascadingPipeline.generateLATCScript({
   *   topic: '5 Sự Thật Về Tiền Mà Trường Học Không Dạy',
   *   persona: 'jennie_mentor',
   *   writingMode: 'mode_1_calm',
   *   track: 'wealth',
   *   productHooks: ['GEM Scanner', 'LATC Money'],
   *   onStepComplete: (step, total, name) => {
   *     console.log(`[${step}/${total}] ${name}`);
   *   },
   *   onStream: (chunk) => process.stdout.write(chunk),
   * });
   * ```
   */
  async generateLATCScript(params) {
    return runFullPipeline(params, "latc");
  },
  /**
   * Tạo kịch bản TMT (Thầy Minh Tuệ Commentary) qua pipeline 5 bước.
   *
   * Tương tự LATC nhưng cấu trúc và quy tắc TMT đặc biệt:
   *   - Gọi Thầy/Ngài (không "ông"/"anh")
   *   - "Đề Bà Đạt Đa 5.0" cho đối tượng phê bình
   *   - Evidence-based claims + nhân quả framing
   *   - Escalation: nhẹ → nặng qua các phần phân tích
   *
   * @param params - Cấu hình pipeline
   * @returns CascadingResult
   */
  async generateTMTScript(params) {
    return runFullPipeline(params, "tmt");
  },
  /**
   * Tạo kịch bản Short Clip qua pipeline rút gọn 3 bước.
   *
   * Pipeline rút gọn (bỏ brand check + polish vì clip ngắn đơn giản):
   *   1. Phân tích chủ đề (Haiku)
   *   2. Tạo outline clip (Sonnet)
   *   3. Viết clip script — có streaming (Sonnet)
   *
   * @param params - Cấu hình pipeline
   * @returns CascadingResult
   *
   * @example
   * ```ts
   * const clip = await cascadingPipeline.generateClipScript({
   *   topic: 'Vì Sao 95% Trader Thua Lỗ',
   *   persona: 'jennie_provocateur',
   *   writingMode: 'mode_2_provocative',
   *   track: 'wealth',
   *   onStepComplete: (step, total, name) => {
   *     setProgress({ step, total, name });
   *   },
   * });
   * ```
   */
  async generateClipScript(params) {
    return runClipPipeline(params);
  }
};

function serviceError$2(message) {
  return { data: null, error: message, success: false };
}
function serviceOk$2(data) {
  return { data, error: null, success: true };
}
const JOB_TYPE_LABELS = {
  script: "Tạo kịch bản",
  title: "Tạo tiêu đề",
  social_post: "Tạo bài đăng mạng xã hội",
  image_prompt: "Tạo prompt hình ảnh",
  short_clip: "Tạo kịch bản clip ngắn",
  repurpose: "Tái sử dụng nội dung",
  analytics: "Phân tích dữ liệu",
  video_process: "Xử lý video"
};
const jobQueue = {
  /**
   * Thêm công việc mới vào hàng đợi.
   *
   * Tạo bản ghi cc_generation_jobs với trạng thái 'queued'.
   * Trả về bản ghi công việc vừa tạo.
   */
  async addJob(params) {
    try {
      const supabase = getSupabase();
      const jobTypeMap = {
        script: "script",
        title: "title",
        social_post: "social_post",
        image_prompt: "image_prompt",
        short_clip: "script",
        repurpose: "script",
        analytics: "analysis",
        video_process: "script"
      };
      const insert = {
        job_type: jobTypeMap[params.type],
        status: "queued",
        priority: params.priority ?? "medium",
        input_params: {
          ...params.params,
          _job_subtype: params.type
        },
        created_by: params.userId,
        content_type: params.contentType ?? null,
        track: params.track ?? null,
        pillar: params.pillar ?? null,
        persona: params.persona ?? null,
        writing_mode: params.writingMode ?? null,
        entity_type: params.entityType ?? null,
        entity_id: params.entityId ?? null,
        max_retries: params.maxRetries ?? 3,
        retry_count: 0,
        metadata: { label: JOB_TYPE_LABELS[params.type] }
      };
      const { data, error } = await supabase.from("cc_generation_jobs").insert(insert).select().single();
      if (error) {
        return serviceError$2(error.message);
      }
      return serviceOk$2(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi thêm công việc vào hàng đợi.";
      return serviceError$2(message);
    }
  },
  /**
   * Lấy danh sách công việc đang hoạt động (queued/processing) của người dùng.
   */
  async getActiveJobs(userId) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_generation_jobs").select("*").eq("created_by", userId).in("status", ["queued", "processing"]).order("created_at", { ascending: true });
      if (error) {
        return serviceError$2(error.message);
      }
      return serviceOk$2(data ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải danh sách công việc đang hoạt động.";
      return serviceError$2(message);
    }
  },
  /**
   * Huỷ một công việc đang chờ hoặc đang xử lý.
   *
   * Chỉ huỷ được công việc có trạng thái 'queued' hoặc 'processing'.
   */
  async cancelJob(jobId) {
    try {
      const supabase = getSupabase();
      const { data: current, error: fetchErr } = await supabase.from("cc_generation_jobs").select("status").eq("id", jobId).single();
      if (fetchErr) {
        return serviceError$2(fetchErr.message);
      }
      const currentStatus = current?.status;
      if (currentStatus !== "queued" && currentStatus !== "processing") {
        return serviceError$2(
          `Không thể huỷ công việc có trạng thái "${currentStatus}". Chỉ huỷ được công việc đang chờ hoặc đang xử lý.`
        );
      }
      const updates = {
        status: "cancelled",
        completed_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const { data, error } = await supabase.from("cc_generation_jobs").update(updates).eq("id", jobId).select().single();
      if (error) {
        return serviceError$2(error.message);
      }
      return serviceOk$2(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi huỷ công việc.";
      return serviceError$2(message);
    }
  },
  /**
   * Cập nhật tiến trình và trạng thái của công việc.
   *
   * @param jobId - ID công việc
   * @param progress - Phần trăm hoàn thành (0-100)
   * @param status - Trạng thái mới (tuỳ chọn)
   */
  async updateProgress(jobId, progress, status) {
    try {
      const supabase = getSupabase();
      const clampedProgress = Math.max(0, Math.min(100, progress));
      const updates = {
        metadata: { progress: clampedProgress },
        updated_at: (/* @__PURE__ */ new Date()).toISOString(),
        ...status ? { status } : {}
      };
      if (status === "processing") {
        updates.started_at = (/* @__PURE__ */ new Date()).toISOString();
      }
      if (status === "completed" || status === "failed") {
        updates.completed_at = (/* @__PURE__ */ new Date()).toISOString();
      }
      const { data, error } = await supabase.from("cc_generation_jobs").update(updates).eq("id", jobId).select().single();
      if (error) {
        return serviceError$2(error.message);
      }
      return serviceOk$2(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi cập nhật tiến trình công việc.";
      return serviceError$2(message);
    }
  },
  /**
   * Lấy công việc cũ nhất đang chờ trong hàng đợi.
   *
   * Ưu tiên theo priority (urgent > high > medium > low),
   * sau đó theo thời gian tạo (cũ nhất trước).
   */
  async getNextQueued() {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_generation_jobs").select("*").eq("status", "queued").order("priority", { ascending: true }).order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (error) {
        return serviceError$2(error.message);
      }
      return serviceOk$2(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi lấy công việc tiếp theo trong hàng đợi.";
      return serviceError$2(message);
    }
  },
  /**
   * Lấy danh sách công việc theo bộ lọc.
   */
  async listJobs(userId, filter = {}) {
    try {
      const supabase = getSupabase();
      const limit = filter.limit ?? 20;
      const offset = filter.offset ?? 0;
      let query = supabase.from("cc_generation_jobs").select("*", { count: "exact" }).eq("created_by", userId);
      if (filter.status) {
        if (Array.isArray(filter.status)) {
          query = query.in("status", filter.status);
        } else {
          query = query.eq("status", filter.status);
        }
      }
      if (filter.jobType) {
        query = query.eq("job_type", filter.jobType);
      }
      query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      const { data, error, count } = await query;
      if (error) {
        return serviceError$2(error.message);
      }
      return serviceOk$2({
        jobs: data ?? [],
        total: count ?? 0
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải danh sách công việc.";
      return serviceError$2(message);
    }
  },
  /**
   * Đếm số công việc đang xử lý (processing).
   */
  async getProcessingCount() {
    try {
      const supabase = getSupabase();
      const { count, error } = await supabase.from("cc_generation_jobs").select("id", { count: "exact", head: true }).eq("status", "processing");
      if (error) {
        return serviceError$2(error.message);
      }
      return serviceOk$2(count ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi đếm công việc đang xử lý.";
      return serviceError$2(message);
    }
  },
  /**
   * Lấy nhãn tiếng Việt cho loại công việc.
   */
  getJobTypeLabel(type) {
    return JOB_TYPE_LABELS[type] ?? type;
  }
};

const state = {
  isRunning: false,
  channel: null,
  callbacks: {
    onJobComplete: () => {
    },
    onJobFailed: () => {
    },
    onJobCreated: () => {
    },
    onJobProcessing: () => {
    }
  }
};
async function createJobNotification(job, success, errorMessage) {
  try {
    const supabase = getSupabase();
    const inputParams = job.input_params;
    const label = job.metadata?.label ?? job.job_type;
    await supabase.from("cc_notifications").insert({
      user_id: job.created_by,
      title: success ? `${label} hoàn thành` : `${label} thất bại`,
      message: success ? `Công việc "${inputParams.topic ?? label}" đã hoàn thành thành công.` : `Công việc "${inputParams.topic ?? label}" thất bại: ${errorMessage ?? "Lỗi không xác định."}`,
      category: "generation",
      severity: success ? "info" : "medium",
      entity_type: "generation_job",
      entity_id: job.id,
      metadata: {}
    });
  } catch {
  }
}
function handleJobUpdate(payload) {
  const updated = payload.new;
  const oldStatus = payload.old?.status;
  const newStatus = updated.status;
  if (oldStatus === newStatus) return;
  switch (newStatus) {
    case "processing":
      state.callbacks.onJobProcessing(updated);
      break;
    case "completed":
      state.callbacks.onJobComplete(updated);
      createJobNotification(updated, true).catch(() => {
      });
      break;
    case "failed": {
      const errorMsg = updated.error_message ?? "Lỗi không xác định.";
      state.callbacks.onJobFailed(updated, errorMsg);
      createJobNotification(updated, false, errorMsg).catch(() => {
      });
      break;
    }
  }
}
function handleJobInsert(payload) {
  const created = payload.new;
  state.callbacks.onJobCreated(created);
}
const jobRunner = {
  /**
   * Bắt đầu giám sát công việc qua Supabase Realtime.
   *
   * Subscribe vào cc_generation_jobs để nhận updates khi:
   * - Job mới được tạo (INSERT)
   * - Job thay đổi trạng thái (UPDATE)
   * Tự động tạo notifications khi completed/failed.
   */
  start(config = {}) {
    if (state.isRunning) {
      return;
    }
    state.isRunning = true;
    state.callbacks = {
      onJobComplete: config.onJobComplete ?? (() => {
      }),
      onJobFailed: config.onJobFailed ?? (() => {
      }),
      onJobCreated: config.onJobCreated ?? (() => {
      }),
      onJobProcessing: config.onJobProcessing ?? (() => {
      })
    };
    const supabase = getSupabase();
    state.channel = supabase.channel("job-runner-monitor").on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "cc_generation_jobs"
      },
      handleJobUpdate
    ).on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "cc_generation_jobs"
      },
      handleJobInsert
    ).subscribe();
  },
  /**
   * Dừng giám sát công việc.
   */
  stop() {
    state.isRunning = false;
    if (state.channel) {
      state.channel.unsubscribe();
      state.channel = null;
    }
  },
  /**
   * Kiểm tra runner đang chạy hay không.
   */
  isRunning() {
    return state.isRunning;
  },
  /**
   * Lấy số công việc đang xử lý (query trực tiếp DB).
   */
  async getActiveCount() {
    const supabase = getSupabase();
    const { count } = await supabase.from("cc_generation_jobs").select("id", { count: "exact", head: true }).eq("status", "processing");
    return count ?? 0;
  },
  /**
   * Lấy danh sách ID các công việc đang xử lý.
   */
  async getActiveJobIds() {
    const supabase = getSupabase();
    const { data } = await supabase.from("cc_generation_jobs").select("id").eq("status", "processing");
    return (data ?? []).map((row) => row.id);
  }
};

const activeTasks = /* @__PURE__ */ new Map();
let taskIdCounter = 0;
let dailyCleanupTimerId = null;
let weeklyAnalysisTimerId = null;
function generateTaskId() {
  taskIdCounter += 1;
  return `task_${Date.now()}_${taskIdCounter}`;
}
function serviceError$1(message) {
  return { data: null, error: message, success: false };
}
function serviceOk$1(data) {
  return { data, error: null, success: true };
}
async function createReminderNotification(userId, eventTitle, eventId, minutesBefore) {
  try {
    const supabase = getSupabase();
    await supabase.from("cc_notifications").insert({
      user_id: userId,
      title: "Nhắc nhở sự kiện",
      message: `Sự kiện "${eventTitle}" sẽ bắt đầu trong ${minutesBefore} phút nữa.`,
      category: "calendar",
      severity: "info",
      entity_type: "calendar_event",
      entity_id: eventId,
      action_label: "Xem sự kiện",
      action_url: `/calendar?event=${eventId}`,
      metadata: {}
    });
  } catch {
  }
}
const schedulerService = {
  /**
   * Lên lịch nhắc nhở trước sự kiện.
   *
   * Tạo setTimeout để gửi thông báo trước sự kiện
   * theo số phút được chỉ định (mặc định: 30 phút).
   *
   * Nếu thời điểm nhắc nhở đã qua, gửi thông báo ngay lập tức.
   */
  scheduleReminder(params) {
    try {
      const minutesBefore = params.minutesBefore ?? 30;
      const reminderTime = new Date(
        params.scheduledAt.getTime() - minutesBefore * 60 * 1e3
      );
      const now = /* @__PURE__ */ new Date();
      const delayMs = Math.max(0, reminderTime.getTime() - now.getTime());
      const taskId = generateTaskId();
      const timerId = setTimeout(async () => {
        await createReminderNotification(
          params.userId,
          params.eventTitle,
          params.eventId,
          minutesBefore
        );
        activeTasks.delete(taskId);
      }, delayMs);
      const task = {
        id: taskId,
        type: "reminder",
        label: `Nhắc nhở: ${params.eventTitle} (${minutesBefore} phút trước)`,
        scheduledAt: reminderTime,
        timerId
      };
      activeTasks.set(taskId, task);
      return serviceOk$1(task);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi lên lịch nhắc nhở.";
      return serviceError$1(message);
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
  scheduleDailyCleanup() {
    try {
      if (dailyCleanupTimerId !== null) {
        return serviceOk$1("Tác vụ dọn dẹp hàng ngày đã được lên lịch trước đó.");
      }
      const runCleanup = async () => {
        try {
          const supabase = getSupabase();
          await supabase.rpc("run_daily_cleanup");
          const { data: session } = await supabase.auth.getSession();
          const userId = session?.session?.user?.id;
          if (userId) {
            await supabase.from("cc_notifications").insert({
              user_id: userId,
              title: "Dọn dẹp hệ thống",
              message: "Tác vụ dọn dẹp dữ liệu hàng ngày đã hoàn thành.",
              category: "system",
              severity: "info",
              metadata: { type: "daily_cleanup", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
            });
          }
        } catch {
        }
      };
      runCleanup();
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1e3;
      dailyCleanupTimerId = setInterval(runCleanup, TWENTY_FOUR_HOURS_MS);
      return serviceOk$1("Đã lên lịch dọn dẹp hàng ngày.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi lên lịch dọn dẹp hàng ngày.";
      return serviceError$1(message);
    }
  },
  /**
   * Bắt đầu tác vụ phân tích hiệu suất hàng tuần.
   *
   * Kích hoạt analyticsAI mỗi 7 ngày để tạo báo cáo
   * phân tích YouTube và tạo thông báo khi hoàn thành.
   */
  scheduleWeeklyAnalysis() {
    try {
      if (weeklyAnalysisTimerId !== null) {
        return serviceOk$1("Tác vụ phân tích hàng tuần đã được lên lịch trước đó.");
      }
      const runWeeklyAnalysis = async () => {
        try {
          const supabase = getSupabase();
          await supabase.functions.invoke("weekly-report", {
            body: {
              trigger: "scheduled",
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }
          });
        } catch {
        }
      };
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1e3;
      weeklyAnalysisTimerId = setInterval(runWeeklyAnalysis, SEVEN_DAYS_MS);
      return serviceOk$1("Đã lên lịch phân tích hàng tuần.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi lên lịch phân tích hàng tuần.";
      return serviceError$1(message);
    }
  },
  /**
   * Huỷ một tác vụ đã lên lịch.
   */
  cancelTask(taskId) {
    const task = activeTasks.get(taskId);
    if (!task) {
      return serviceError$1(`Không tìm thấy tác vụ với ID "${taskId}".`);
    }
    clearTimeout(task.timerId);
    activeTasks.delete(taskId);
    return serviceOk$1(null);
  },
  /**
   * Huỷ tất cả tác vụ đã lên lịch và dừng lịch trình định kỳ.
   */
  cancelAll() {
    for (const [id, task] of activeTasks.entries()) {
      clearTimeout(task.timerId);
      activeTasks.delete(id);
    }
    if (dailyCleanupTimerId !== null) {
      clearInterval(dailyCleanupTimerId);
      dailyCleanupTimerId = null;
    }
    if (weeklyAnalysisTimerId !== null) {
      clearInterval(weeklyAnalysisTimerId);
      weeklyAnalysisTimerId = null;
    }
  },
  /**
   * Lấy danh sách tất cả tác vụ đang chờ.
   */
  getActiveTasks() {
    return Array.from(activeTasks.values());
  },
  /**
   * Lấy số lượng tác vụ đang chờ.
   */
  getActiveTaskCount() {
    return activeTasks.size;
  }
};

const EVENT_LABELS = {
  generation_complete: "Tạo nội dung hoàn thành",
  review_needed: "Cần duyệt nội dung",
  analytics_ready: "Báo cáo phân tích sẵn sàng",
  job_failed: "Công việc thất bại",
  daily_cleanup: "Dọn dẹp hệ thống hàng ngày",
  content_published: "Nội dung đã xuất bản"
};
function formatSlackMessage(payload) {
  const eventLabel = EVENT_LABELS[payload.event] ?? payload.event;
  return {
    text: `[GEM Content Center] ${eventLabel}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📌 ${eventLabel}`
        }
      },
      {
        type: "section",
        fields: Object.entries(payload.data).slice(0, 10).map(([key, value]) => ({
          type: "mrkdwn",
          text: `*${key}:*
${String(value)}`
        }))
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `GEM Content Control Center | ${new Date(payload.timestamp).toLocaleString("vi-VN")}`
          }
        ]
      }
    ]
  };
}
function formatTelegramMessage(payload) {
  const eventLabel = EVENT_LABELS[payload.event] ?? payload.event;
  const dataLines = Object.entries(payload.data).slice(0, 10).map(([key, value]) => `• <b>${key}:</b> ${String(value)}`).join("\n");
  return [
    `<b>📌 ${eventLabel}</b>`,
    "",
    dataLines,
    "",
    `<i>GEM Content Center — ${new Date(payload.timestamp).toLocaleString("vi-VN")}</i>`
  ].join("\n");
}
const webhookService = {
  /**
   * Gửi thông báo đến Slack qua Incoming Webhook.
   */
  async sendToSlack(webhookUrl, event, data) {
    try {
      const payload = {
        event,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        data
      };
      const slackBody = formatSlackMessage(payload);
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackBody)
      });
      return {
        channel: "slack",
        success: response.ok,
        statusCode: response.status,
        errorMessage: response.ok ? void 0 : `Slack trả về HTTP ${response.status}.`
      };
    } catch (err) {
      return {
        channel: "slack",
        success: false,
        errorMessage: err instanceof Error ? err.message : "Lỗi gửi Slack webhook."
      };
    }
  },
  /**
   * Gửi thông báo đến Telegram qua Bot API.
   *
   * URL format: https://api.telegram.org/bot{TOKEN}/sendMessage
   * Tham số data cần có `chatId` hoặc sử dụng chatId trong webhookUrl.
   */
  async sendToTelegram(botToken, chatId, event, data) {
    try {
      const payload = {
        event,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        data
      };
      const text = formatTelegramMessage(payload);
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true
          })
        }
      );
      const result = await response.json();
      const telegramOk = result?.ok === true;
      return {
        channel: "telegram",
        success: telegramOk,
        statusCode: response.status,
        errorMessage: telegramOk ? void 0 : `Telegram API lỗi: ${result?.description ?? "Không rõ."}`
      };
    } catch (err) {
      return {
        channel: "telegram",
        success: false,
        errorMessage: err instanceof Error ? err.message : "Lỗi gửi Telegram webhook."
      };
    }
  },
  /**
   * Lưu cấu hình webhook vào Supabase.
   *
   * Cấu hình được lưu trong metadata của profiles hoặc
   * bảng riêng tuỳ theo thiết kế.
   * Hiện tại lưu vào localStorage cho client-side.
   */
  async configure(userId, config) {
    try {
      const supabase = getSupabase();
      const { data: profile } = await supabase.from("profiles").select("preferences").eq("id", userId).single();
      const preferences = profile?.preferences ?? {};
      const webhooks = preferences.webhooks ?? [];
      const existingIndex = webhooks.findIndex(
        (w) => w.channel === config.channel
      );
      if (existingIndex >= 0) {
        webhooks[existingIndex] = config;
      } else {
        webhooks.push(config);
      }
      const { error } = await supabase.from("profiles").update({
        preferences: { ...preferences, webhooks },
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", userId);
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: config, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi lưu cấu hình webhook.";
      return { data: null, error: message, success: false };
    }
  },
  /**
   * Lấy danh sách cấu hình webhook của người dùng.
   */
  async getConfigs(userId) {
    try {
      const supabase = getSupabase();
      const { data: profile, error } = await supabase.from("profiles").select("preferences").eq("id", userId).single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      const preferences = profile?.preferences ?? {};
      const webhooks = preferences.webhooks ?? [];
      return { data: webhooks, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải cấu hình webhook.";
      return { data: null, error: message, success: false };
    }
  },
  /**
   * Phát sự kiện đến tất cả webhook đã cấu hình.
   *
   * Tự động gửi đến các kênh đã đăng ký nhận sự kiện này.
   */
  async dispatch(userId, event, data) {
    const { data: configs } = await this.getConfigs(userId);
    if (!configs || configs.length === 0) {
      return [];
    }
    const results = [];
    for (const config of configs) {
      if (!config.isActive || !config.events.includes(event)) {
        continue;
      }
      if (config.channel === "slack") {
        const result = await this.sendToSlack(config.url, event, data);
        results.push(result);
      } else if (config.channel === "telegram") {
        const meta = config.metadata ?? {};
        const chatId = meta.chatId ?? "";
        const result = await this.sendToTelegram(config.url, chatId, event, data);
        results.push(result);
      }
    }
    return results;
  },
  /**
   * Lấy nhãn tiếng Việt cho loại sự kiện.
   */
  getEventLabel(event) {
    return EVENT_LABELS[event] ?? event;
  }
};

const BACKUP_VERSION = "1.0.0";
const STORAGE_BUCKET = "backups";
const BACKUP_TABLES = [
  "cc_scripts",
  "cc_titles",
  "cc_social_posts",
  "cc_image_prompts",
  "cc_calendar_events",
  "cc_generation_jobs"
];
const TABLE_KEY_MAP = {
  cc_scripts: "scripts",
  cc_titles: "titles",
  cc_social_posts: "socialPosts",
  cc_image_prompts: "imagePrompts",
  cc_calendar_events: "calendarEvents",
  cc_generation_jobs: "generationJobs"
};
function serviceError(message) {
  return { data: null, error: message, success: false };
}
function serviceOk(data) {
  return { data, error: null, success: true };
}
function generateBackupFilename() {
  const now = /* @__PURE__ */ new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0]?.replace(/:/g, "") ?? "000000";
  return `backup_${date}_${time}.json`;
}
const backupService = {
  /**
   * Xuất toàn bộ dữ liệu nội dung của người dùng sang JSON.
   *
   * Bao gồm: scripts, titles, social posts, image prompts,
   * calendar events, và generation jobs.
   */
  async exportAllData(userId) {
    try {
      const supabase = getSupabase();
      const tables = {};
      const tablesCounts = {};
      let totalRecords = 0;
      for (const tableName of BACKUP_TABLES) {
        const { data, error } = await supabase.from(tableName).select("*").eq("created_by", userId).order("created_at", { ascending: false });
        if (error) {
          tables[TABLE_KEY_MAP[tableName] ?? tableName] = [];
          tablesCounts[tableName] = 0;
          continue;
        }
        const records = data ?? [];
        tables[TABLE_KEY_MAP[tableName] ?? tableName] = records;
        tablesCounts[tableName] = records.length;
        totalRecords += records.length;
      }
      const backup = {
        version: BACKUP_VERSION,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        userId,
        tables,
        metadata: {
          totalRecords,
          tablesCounts
        }
      };
      return serviceOk(backup);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi xuất dữ liệu sao lưu.";
      return serviceError(message);
    }
  },
  /**
   * Khôi phục dữ liệu từ bản sao lưu JSON.
   *
   * Chèn lại dữ liệu vào các bảng tương ứng.
   * Bỏ qua bản ghi trùng ID (upsert).
   */
  async importData(backup, userId) {
    try {
      if (!backup.version || !backup.tables) {
        return serviceError("Định dạng file sao lưu không hợp lệ.");
      }
      const supabase = getSupabase();
      let imported = 0;
      const errors = [];
      const tableEntries = Object.entries(backup.tables);
      const reverseTableMap = {};
      for (const [tableName, key] of Object.entries(TABLE_KEY_MAP)) {
        reverseTableMap[key] = tableName;
      }
      for (const [key, records] of tableEntries) {
        if (!records || records.length === 0) continue;
        const tableName = reverseTableMap[key];
        if (!tableName) {
          errors.push(`Không nhận dạng được bảng: ${key}`);
          continue;
        }
        const updatedRecords = records.map((record) => {
          const rec = record;
          return {
            ...rec,
            created_by: userId,
            // Xoá id để tránh xung đột — tạo mới
            id: void 0
          };
        });
        const { error } = await supabase.from(tableName).insert(updatedRecords);
        if (error) {
          errors.push(`Lỗi import ${tableName}: ${error.message}`);
        } else {
          imported += updatedRecords.length;
        }
      }
      return serviceOk({ imported, errors });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi khôi phục dữ liệu từ sao lưu.";
      return serviceError(message);
    }
  },
  /**
   * Tải bản sao lưu lên Supabase Storage.
   *
   * Lưu file JSON vào bucket 'backups' với đường dẫn:
   * {userId}/{backup_filename}.json
   */
  async uploadBackup(userId, backup) {
    try {
      const supabase = getSupabase();
      const filename = generateBackupFilename();
      const filePath = `${userId}/${filename}`;
      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, blob, {
        contentType: "application/json",
        upsert: false
      });
      if (error) {
        return serviceError(`Lỗi tải lên sao lưu: ${error.message}`);
      }
      const info = {
        name: filename,
        path: filePath,
        size: jsonString.length,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      return serviceOk(info);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải lên bản sao lưu.";
      return serviceError(message);
    }
  },
  /**
   * Liệt kê các bản sao lưu có sẵn trong Storage.
   */
  async listBackups(userId) {
    try {
      const supabase = getSupabase();
      const folderPath = `${userId}/`;
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folderPath, {
        sortBy: { column: "created_at", order: "desc" }
      });
      if (error) {
        return serviceError(`Lỗi liệt kê bản sao lưu: ${error.message}`);
      }
      const backups = (data ?? []).filter((file) => file.name.endsWith(".json")).map((file) => ({
        name: file.name,
        path: `${folderPath}${file.name}`,
        size: file.metadata?.size ?? 0,
        createdAt: file.created_at ?? ""
      }));
      return serviceOk(backups);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi liệt kê bản sao lưu.";
      return serviceError(message);
    }
  },
  /**
   * Tải về bản sao lưu từ Storage.
   */
  async downloadBackup(userId, backupName) {
    try {
      const supabase = getSupabase();
      const filePath = `${userId}/${backupName}`;
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(filePath);
      if (error) {
        return serviceError(`Lỗi tải về sao lưu: ${error.message}`);
      }
      if (!data) {
        return serviceError("Không tìm thấy file sao lưu.");
      }
      const text = await data.text();
      const backup = JSON.parse(text);
      return serviceOk(backup);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải về bản sao lưu.";
      return serviceError(message);
    }
  },
  /**
   * Xoá bản sao lưu khỏi Storage.
   */
  async deleteBackup(userId, backupName) {
    try {
      const supabase = getSupabase();
      const filePath = `${userId}/${backupName}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
      if (error) {
        return serviceError(`Lỗi xoá bản sao lưu: ${error.message}`);
      }
      return serviceOk(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi xoá bản sao lưu.";
      return serviceError(message);
    }
  }
};

const VIETNAMESE_MAP = {
  "à": "a",
  "á": "a",
  "ả": "a",
  "ã": "a",
  "ạ": "a",
  "ă": "a",
  "ắ": "a",
  "ằ": "a",
  "ẳ": "a",
  "ẵ": "a",
  "ặ": "a",
  "â": "a",
  "ấ": "a",
  "ầ": "a",
  "ẩ": "a",
  "ẫ": "a",
  "ậ": "a",
  "è": "e",
  "é": "e",
  "ẻ": "e",
  "ẽ": "e",
  "ẹ": "e",
  "ê": "e",
  "ế": "e",
  "ề": "e",
  "ể": "e",
  "ễ": "e",
  "ệ": "e",
  "ì": "i",
  "í": "i",
  "ỉ": "i",
  "ĩ": "i",
  "ị": "i",
  "ò": "o",
  "ó": "o",
  "ỏ": "o",
  "õ": "o",
  "ọ": "o",
  "ô": "o",
  "ố": "o",
  "ồ": "o",
  "ổ": "o",
  "ỗ": "o",
  "ộ": "o",
  "ơ": "o",
  "ớ": "o",
  "ờ": "o",
  "ở": "o",
  "ỡ": "o",
  "ợ": "o",
  "ù": "u",
  "ú": "u",
  "ủ": "u",
  "ũ": "u",
  "ụ": "u",
  "ư": "u",
  "ứ": "u",
  "ừ": "u",
  "ử": "u",
  "ữ": "u",
  "ự": "u",
  "ỳ": "y",
  "ý": "y",
  "ỷ": "y",
  "ỹ": "y",
  "ỵ": "y",
  "đ": "d",
  // Viết hoa
  "À": "a",
  "Á": "a",
  "Ả": "a",
  "Ã": "a",
  "Ạ": "a",
  "Ă": "a",
  "Ắ": "a",
  "Ằ": "a",
  "Ẳ": "a",
  "Ẵ": "a",
  "Ặ": "a",
  "Â": "a",
  "Ấ": "a",
  "Ầ": "a",
  "Ẩ": "a",
  "Ẫ": "a",
  "Ậ": "a",
  "È": "e",
  "É": "e",
  "Ẻ": "e",
  "Ẽ": "e",
  "Ẹ": "e",
  "Ê": "e",
  "Ế": "e",
  "Ề": "e",
  "Ể": "e",
  "Ễ": "e",
  "Ệ": "e",
  "Ì": "i",
  "Í": "i",
  "Ỉ": "i",
  "Ĩ": "i",
  "Ị": "i",
  "Ò": "o",
  "Ó": "o",
  "Ỏ": "o",
  "Õ": "o",
  "Ọ": "o",
  "Ô": "o",
  "Ố": "o",
  "Ồ": "o",
  "Ổ": "o",
  "Ỗ": "o",
  "Ộ": "o",
  "Ơ": "o",
  "Ớ": "o",
  "Ờ": "o",
  "Ở": "o",
  "Ỡ": "o",
  "Ợ": "o",
  "Ù": "u",
  "Ú": "u",
  "Ủ": "u",
  "Ũ": "u",
  "Ụ": "u",
  "Ư": "u",
  "Ứ": "u",
  "Ừ": "u",
  "Ử": "u",
  "Ữ": "u",
  "Ự": "u",
  "Ỳ": "y",
  "Ý": "y",
  "Ỷ": "y",
  "Ỹ": "y",
  "Ỵ": "y",
  "Đ": "d"
};
const slugGenerator = {
  /**
   * Tạo slug URL-safe từ tiêu đề tiếng Việt.
   *
   * Quy trình:
   * 1. Chuyển dấu tiếng Việt → ký tự không dấu (đ → d, ư → u, v.v.)
   * 2. Chuyển thường toàn bộ
   * 3. Thay khoảng trắng và ký tự đặc biệt bằng dấu gạch ngang
   * 4. Loại bỏ gạch ngang liên tiếp và gạch ngang đầu/cuối
   * 5. Giới hạn 100 ký tự
   *
   * @example
   * generateSlug("Từ 1 Đồng Xu → Tần Số Thay Đổi Cả Cuộc Đời")
   * // → "tu-1-dong-xu-tan-so-thay-doi-ca-cuoc-doi"
   */
  generateSlug(title) {
    let slug = title;
    slug = slug.split("").map((char) => VIETNAMESE_MAP[char] ?? char).join("");
    slug = slug.toLowerCase();
    slug = slug.replace(/[^a-z0-9]+/g, "-");
    slug = slug.replace(/-+/g, "-");
    slug = slug.replace(/^-|-$/g, "");
    slug = slug.slice(0, 100);
    slug = slug.replace(/-$/, "");
    return slug || "untitled";
  },
  /**
   * Đảm bảo slug duy nhất trong bảng Supabase.
   *
   * Kiểm tra xem slug đã tồn tại chưa. Nếu trùng,
   * thêm hậu tố -2, -3, ... cho đến khi tìm được slug duy nhất.
   *
   * @param slug - Slug cơ sở cần kiểm tra
   * @param table - Tên bảng Supabase (ví dụ: 'cc_scripts')
   * @param column - Tên cột chứa slug (mặc định: 'slug')
   * @param excludeId - ID bản ghi cần bỏ qua (khi cập nhật)
   */
  async ensureUnique(slug, table, column = "slug", excludeId) {
    const supabase = getSupabase();
    let candidate = slug;
    let suffix = 1;
    while (true) {
      let query = supabase.from(table).select("id", { count: "exact", head: true }).eq(column, candidate);
      if (excludeId) {
        query = query.neq("id", excludeId);
      }
      const { count } = await query;
      if ((count ?? 0) === 0) {
        return candidate;
      }
      suffix += 1;
      candidate = `${slug}-${suffix}`;
      if (suffix > 100) {
        return `${slug}-${Date.now()}`;
      }
    }
  },
  /**
   * Tạo slug duy nhất từ tiêu đề tiếng Việt.
   *
   * Kết hợp generateSlug() và ensureUnique() trong một bước.
   */
  async createUniqueSlug(title, table, column = "slug", excludeId) {
    const baseSlug = this.generateSlug(title);
    return this.ensureUnique(baseSlug, table, column, excludeId);
  }
};

const CTR_DROP_THRESHOLD = 0.3;
const RETENTION_CLIFF_THRESHOLD = 0.2;
const REVENUE_ANOMALY_THRESHOLD = 0.5;
const MIN_VIDEOS_FOR_ANALYSIS = 3;
function average$2(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
function standardDeviation$1(values) {
  if (values.length < 2) return 0;
  const avg = average$2(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / (values.length - 1));
}
function nowISO() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
const anomalyDetector = {
  /**
   * Detect videos with CTR significantly below channel average.
   * Alerts when a video's CTR drops more than 30% below the channel average.
   */
  detectCTRDrop(videos) {
    const alerts = [];
    const ctrs = videos.map((v) => v.ctr).filter((ctr) => typeof ctr === "number" && ctr > 0);
    if (ctrs.length < MIN_VIDEOS_FOR_ANALYSIS) return alerts;
    const avgCTR = average$2(ctrs);
    const threshold = avgCTR * (1 - CTR_DROP_THRESHOLD);
    for (const video of videos) {
      if (typeof video.ctr !== "number" || video.ctr <= 0) continue;
      if (video.ctr >= threshold) continue;
      const deviationPercent = (avgCTR - video.ctr) / avgCTR * 100;
      const severity = deviationPercent > 50 ? "critical" : deviationPercent > 40 ? "high" : "medium";
      alerts.push({
        type: "ctr_drop",
        severity,
        videoId: video.youtube_id ?? video.id,
        videoTitle: video.title,
        metric: "CTR",
        currentValue: Math.round(video.ctr * 100) / 100,
        expectedValue: Math.round(avgCTR * 100) / 100,
        deviationPercent: Math.round(deviationPercent * 10) / 10,
        message: `CTR video "${video.title}" ở mức ${video.ctr.toFixed(1)}%, thấp hơn ${deviationPercent.toFixed(0)}% so với trung bình kênh (${avgCTR.toFixed(1)}%).`,
        suggestion: deviationPercent > 50 ? "Thumbnail và tiêu đề cần làm lại hoàn toàn. Thử A/B test với formula mới." : "Kiểm tra thumbnail contrast và tiêu đề. Thử thay đổi title formula.",
        detectedAt: nowISO()
      });
    }
    return alerts;
  },
  /**
   * Detect retention cliffs — sudden drop-off points in audience retention.
   * A cliff is a point where watch ratio drops >20% between consecutive points.
   */
  detectRetentionCliff(retentionData, videoId, videoTitle) {
    const alerts = [];
    if (retentionData.length < 3) return alerts;
    const sorted = [...retentionData].sort((a, b) => a.timeRatio - b.timeRatio);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (!prev || !curr) continue;
      const drop = prev.watchRatio - curr.watchRatio;
      const dropPercent = prev.watchRatio > 0 ? drop / prev.watchRatio : 0;
      if (dropPercent < RETENTION_CLIFF_THRESHOLD) continue;
      const timePercent = Math.round(curr.timeRatio * 100);
      const severity = dropPercent > 0.4 ? "critical" : dropPercent > 0.3 ? "high" : "medium";
      alerts.push({
        type: "retention_cliff",
        severity,
        videoId,
        videoTitle,
        metric: "Audience Retention",
        currentValue: Math.round(curr.watchRatio * 100),
        expectedValue: Math.round(prev.watchRatio * 100),
        deviationPercent: Math.round(dropPercent * 100),
        message: `Drop-off ${Math.round(dropPercent * 100)}% tại ${timePercent}% video${videoTitle ? ` "${videoTitle}"` : ""}. Retention giảm từ ${Math.round(prev.watchRatio * 100)}% xuống ${Math.round(curr.watchRatio * 100)}%.`,
        suggestion: timePercent < 10 ? "Hook quá yếu. Mở đầu cần gây tò mò mạnh hơn trong 10 giây đầu." : timePercent < 30 ? "Phần mở rộng (context) quá dài. Đi thẳng vào nội dung chính sớm hơn." : "Nội dung mất hấp dẫn. Thêm pattern-interrupt (câu hỏi tu từ, ví dụ bất ngờ) tại điểm này.",
        detectedAt: nowISO()
      });
    }
    return alerts;
  },
  /**
   * Detect revenue anomalies — spikes or drops deviating >50% from average.
   */
  detectRevenueAnomaly(videos) {
    const alerts = [];
    const revenues = videos.map((v) => v.estimated_revenue ?? v.estimatedRevenue).filter((r) => typeof r === "number" && r > 0);
    if (revenues.length < MIN_VIDEOS_FOR_ANALYSIS) return alerts;
    const avgRevenue = average$2(revenues);
    const stdDev = standardDeviation$1(revenues);
    const upperBound = avgRevenue + avgRevenue * REVENUE_ANOMALY_THRESHOLD;
    const lowerBound = avgRevenue - avgRevenue * REVENUE_ANOMALY_THRESHOLD;
    for (const video of videos) {
      const revenue = video.estimated_revenue ?? video.estimatedRevenue;
      if (typeof revenue !== "number" || revenue <= 0) continue;
      if (revenue > upperBound) {
        const deviationPercent = (revenue - avgRevenue) / avgRevenue * 100;
        alerts.push({
          type: "revenue_spike",
          severity: deviationPercent > 100 ? "high" : "medium",
          videoId: video.youtube_id ?? video.id,
          videoTitle: video.title,
          metric: "Revenue (USD)",
          currentValue: Math.round(revenue * 100) / 100,
          expectedValue: Math.round(avgRevenue * 100) / 100,
          deviationPercent: Math.round(deviationPercent),
          message: `Revenue video "${video.title}" cao hơn ${Math.round(deviationPercent)}% so với trung bình ($${revenue.toFixed(2)} vs $${avgRevenue.toFixed(2)}).`,
          suggestion: "Phân tích yếu tố thành công: track, title formula, persona. Nhân rộng pattern này.",
          detectedAt: nowISO()
        });
      } else if (revenue < lowerBound && stdDev > 0) {
        const deviationPercent = (avgRevenue - revenue) / avgRevenue * 100;
        alerts.push({
          type: "revenue_drop",
          severity: deviationPercent > 80 ? "high" : "medium",
          videoId: video.youtube_id ?? video.id,
          videoTitle: video.title,
          metric: "Revenue (USD)",
          currentValue: Math.round(revenue * 100) / 100,
          expectedValue: Math.round(avgRevenue * 100) / 100,
          deviationPercent: Math.round(deviationPercent),
          message: `Revenue video "${video.title}" thấp hơn ${Math.round(deviationPercent)}% so với trung bình ($${revenue.toFixed(2)} vs $${avgRevenue.toFixed(2)}).`,
          suggestion: "Kiểm tra content type và track. Revenue thấp thường do audience không khớp với advertiser.",
          detectedAt: nowISO()
        });
      }
    }
    return alerts;
  },
  /**
   * Run all anomaly detection checks and return combined alerts.
   */
  detectAll(videos, retentionData) {
    const anomalies = [
      ...this.detectCTRDrop(videos),
      ...this.detectRevenueAnomaly(videos)
    ];
    if (retentionData) {
      for (const { videoId, videoTitle, data } of retentionData) {
        anomalies.push(...this.detectRetentionCliff(data, videoId, videoTitle));
      }
    }
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    anomalies.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
    return { anomalies };
  }
};

const TRACK_KEYWORDS = {
  wealth: {
    keywords: [
      "bitcoin",
      "crypto",
      "trading",
      "đầu tư",
      "tài chính",
      "tiền",
      "giao dịch",
      "portfolio",
      "lợi nhuận",
      "cắt lỗ",
      "chốt lời",
      "chart",
      "xu hướng",
      "altcoin",
      "blockchain",
      "defi",
      "nft",
      "thị trường",
      "vốn",
      "cổ phiếu",
      "bất động sản",
      "thu nhập",
      "scanner",
      "whale",
      "token",
      "leverage",
      "margin"
    ],
    weight: 1
  },
  wellness: {
    keywords: [
      "thiền",
      "tần số",
      "năng lượng",
      "tâm thức",
      "chữa lành",
      "nghiệp",
      "rung động",
      "giác ngộ",
      "tâm linh",
      "thức tỉnh",
      "meditation",
      "healing",
      "karma",
      "phật",
      "tu tập",
      "từ bi",
      "bình an",
      "chánh niệm",
      "trí tuệ",
      "giải thoát",
      "luân hồi",
      "tarot",
      "tình yêu",
      "sức khỏe tinh thần"
    ],
    weight: 1
  },
  integration: {
    keywords: [
      "cuộc sống",
      "hành trình",
      "cân bằng",
      "phát triển bản thân",
      "kết hợp",
      "tích hợp",
      "tổng thể",
      "mindful trading",
      "tài chính tâm thức",
      "giàu có thật sự",
      "tự do tài chính",
      "mục đích sống",
      "ý nghĩa",
      "hạnh phúc",
      "thành công",
      "sứ mệnh",
      "legacy",
      "cộng đồng",
      "cho đi",
      "tri ân"
    ],
    weight: 1.2
    // Slightly higher weight for integration (40% target)
  }
};
const CONTENT_TYPE_KEYWORDS = {
  latc: {
    keywords: [
      "sự thật",
      "bí mật",
      "không ai nói",
      "trường học",
      "quy tắc",
      "chiến lược",
      "framework",
      "hệ thống",
      "phân tích sâu",
      "deep dive",
      "toàn diện"
    ],
    weight: 1
  },
  tmt: {
    keywords: [
      "thầy minh tuệ",
      "sư",
      "tu sĩ",
      "tu hành",
      "khất sĩ",
      "nhân quả",
      "đề bà",
      "phật pháp",
      "tăng đoàn",
      "giới luật",
      "bộ hành",
      "đầu trần chân đất"
    ],
    weight: 1.5
  },
  short_clip: {
    keywords: [
      "nhanh",
      "ngắn",
      "30 giây",
      "1 phút",
      "tip",
      "hack",
      "câu hỏi nhanh",
      "reels",
      "shorts",
      "tiktok"
    ],
    weight: 1
  },
  social_post: {
    keywords: [
      "post",
      "bài đăng",
      "facebook",
      "instagram",
      "threads",
      "caption",
      "hashtag",
      "mạng xã hội",
      "social"
    ],
    weight: 1
  },
  news: {
    keywords: [
      "tin tức",
      "news",
      "blog",
      "bài viết",
      "phân tích",
      "thị trường",
      "SEO",
      "báo chí",
      "chuyên đề"
    ],
    weight: 1
  }
};
const PERSONA_KEYWORDS = {
  jennie_mentor: {
    keywords: ["hướng dẫn", "dẫn dắt", "chia sẻ", "kinh nghiệm", "bài học", "con đường"],
    weight: 1
  },
  jennie_provocateur: {
    keywords: ["sai lầm", "thách thức", "phá vỡ", "khó nghe", "sự thật phũ", "dám", "brutal"],
    weight: 1.2
  },
  jennie_storyteller: {
    keywords: ["câu chuyện", "kể", "ngày xưa", "hành trình", "trải nghiệm", "cảm xúc"],
    weight: 1
  },
  jennie_analyst: {
    keywords: ["số liệu", "phân tích", "dữ liệu", "thống kê", "biểu đồ", "evidence", "research"],
    weight: 1
  },
  jennie_motivator: {
    keywords: ["bạn có thể", "hành động", "bắt đầu ngay", "thay đổi", "động lực", "năng lượng"],
    weight: 1
  },
  jennie_educator: {
    keywords: ["giải thích", "bước", "hướng dẫn", "framework", "hệ thống", "cách làm"],
    weight: 1
  },
  jennie_confidante: {
    keywords: ["tâm sự", "thấu hiểu", "nỗi đau", "cô đơn", "ôm", "bình yên", "lắng nghe"],
    weight: 1
  }
};
function scoreText(text, keywordMap) {
  const lowerText = text.toLowerCase();
  const scores = {};
  let maxScore = -1;
  let winner;
  for (const key of Object.keys(keywordMap)) {
    const config = keywordMap[key];
    let score = 0;
    for (const keyword of config.keywords) {
      const regex = new RegExp(keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      const matches = lowerText.match(regex);
      if (matches) {
        score += matches.length * config.weight;
      }
    }
    scores[key] = score;
    if (score > maxScore) {
      maxScore = score;
      winner = key;
    }
  }
  if (winner === void 0) {
    winner = Object.keys(keywordMap)[0];
  }
  return { winner, scores };
}
function calculateConfidence(scores) {
  const values = Object.values(scores);
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total === 0) return 0;
  const max = Math.max(...values);
  const confidence = max / total;
  return Math.min(1, Math.max(0, confidence));
}
const contentClassifier = {
  /**
   * Classify text content by type, track, and persona.
   *
   * @example
   * ```ts
   * const result = contentClassifier.classifyContent(
   *   'Bitcoin vừa breakout lên $100K. 5 sai lầm trader mới mắc phải khi FOMO.'
   * );
   * // { contentType: 'latc', track: 'wealth', persona: 'jennie_provocateur', confidence: 0.72 }
   * ```
   */
  classifyContent(text) {
    if (!text || text.trim().length === 0) {
      return {
        contentType: "latc",
        track: "integration",
        persona: "jennie_mentor",
        confidence: 0
      };
    }
    const typeResult = scoreText(text, CONTENT_TYPE_KEYWORDS);
    const trackResult = scoreText(text, TRACK_KEYWORDS);
    const personaResult = scoreText(text, PERSONA_KEYWORDS);
    const confidences = [
      calculateConfidence(typeResult.scores),
      calculateConfidence(trackResult.scores),
      calculateConfidence(personaResult.scores)
    ];
    const avgConfidence = confidences.reduce((s, c) => s + c, 0) / confidences.length;
    return {
      contentType: typeResult.winner,
      track: trackResult.winner,
      persona: personaResult.winner,
      confidence: Math.round(avgConfidence * 100) / 100
    };
  },
  /**
   * Classify with detailed scores for each dimension.
   */
  classifyDetailed(text) {
    const typeResult = scoreText(text, CONTENT_TYPE_KEYWORDS);
    const trackResult = scoreText(text, TRACK_KEYWORDS);
    const personaResult = scoreText(text, PERSONA_KEYWORDS);
    const confidences = [
      calculateConfidence(typeResult.scores),
      calculateConfidence(trackResult.scores),
      calculateConfidence(personaResult.scores)
    ];
    const avgConfidence = confidences.reduce((s, c) => s + c, 0) / confidences.length;
    return {
      result: {
        contentType: typeResult.winner,
        track: trackResult.winner,
        persona: personaResult.winner,
        confidence: Math.round(avgConfidence * 100) / 100
      },
      typeScores: typeResult.scores,
      trackScores: trackResult.scores,
      personaScores: personaResult.scores
    };
  }
};

const SIMILARITY_THRESHOLD = 0.25;
const MIN_SERIES_SIZE = 2;
function trigrams(text) {
  const normalized = text.toLowerCase().trim();
  const grams = /* @__PURE__ */ new Set();
  for (let i = 0; i <= normalized.length - 3; i++) {
    grams.add(normalized.slice(i, i + 3));
  }
  return grams;
}
function trigramSimilarity(a, b) {
  const setA = trigrams(a);
  const setB = trigrams(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const gram of setA) {
    if (setB.has(gram)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}
function scriptSimilarity(a, b) {
  let score = 0;
  let factors = 0;
  const titleSim = trigramSimilarity(a.title, b.title);
  score += titleSim * 3;
  factors += 3;
  if (a.track && b.track && a.track === b.track) {
    score += 1;
  }
  factors += 1;
  if (a.content_type && b.content_type && a.content_type === b.content_type) {
    score += 0.5;
  }
  factors += 0.5;
  if (a.tags && b.tags && a.tags.length > 0 && b.tags.length > 0) {
    const tagsA = new Set(a.tags.map((t) => t.toLowerCase()));
    const tagsB = new Set(b.tags.map((t) => t.toLowerCase()));
    let shared = 0;
    for (const tag of tagsA) {
      if (tagsB.has(tag)) shared++;
    }
    const tagSim = shared / Math.max(tagsA.size, tagsB.size);
    score += tagSim * 2;
  }
  factors += 2;
  return score / factors;
}
function extractCommonWords(titles) {
  const stopWords = /* @__PURE__ */ new Set([
    "và",
    "của",
    "cho",
    "trong",
    "với",
    "là",
    "một",
    "các",
    "để",
    "từ",
    "bạn",
    "này",
    "có",
    "không",
    "về",
    "đến",
    "hay",
    "nhưng",
    "mà",
    "khi",
    "thì",
    "được",
    "sẽ",
    "đã",
    "phải",
    "nào",
    "mỗi",
    "the",
    "a",
    "an",
    "of",
    "to",
    "in",
    "for",
    "on",
    "with"
  ]);
  const wordCounts = /* @__PURE__ */ new Map();
  for (const title of titles) {
    const words = title.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
    const unique = new Set(words);
    for (const word of unique) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }
  const threshold = Math.ceil(titles.length / 2);
  return [...wordCounts.entries()].filter(([, count]) => count >= threshold).sort((a, b) => b[1] - a[1]).map(([word]) => word);
}
const seriesLinker = {
  /**
   * Detect groups of scripts that form natural content series.
   * Uses title trigram similarity, shared tags, and track matching.
   */
  detectSeries(scripts) {
    if (scripts.length < MIN_SERIES_SIZE) return [];
    const groups = [];
    const assigned = /* @__PURE__ */ new Set();
    for (let i = 0; i < scripts.length; i++) {
      const scriptA = scripts[i];
      if (!scriptA || assigned.has(scriptA.id)) continue;
      const group = [scriptA];
      assigned.add(scriptA.id);
      for (let j = i + 1; j < scripts.length; j++) {
        const scriptB = scripts[j];
        if (!scriptB || assigned.has(scriptB.id)) continue;
        const similarity = scriptSimilarity(scriptA, scriptB);
        if (similarity >= SIMILARITY_THRESHOLD) {
          group.push(scriptB);
          assigned.add(scriptB.id);
        }
      }
      if (group.length >= MIN_SERIES_SIZE) {
        groups.push(group);
      }
    }
    return groups.map((group) => {
      const name = this.suggestSeriesName(group);
      const trackCounts = /* @__PURE__ */ new Map();
      for (const s of group) {
        const track = s.track ?? "integration";
        trackCounts.set(track, (trackCounts.get(track) ?? 0) + 1);
      }
      const dominantTrack = [...trackCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "integration";
      let totalSim = 0;
      let pairs = 0;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const gi = group[i];
          const gj = group[j];
          if (gi && gj) {
            totalSim += scriptSimilarity(gi, gj);
            pairs++;
          }
        }
      }
      const confidence = pairs > 0 ? Math.round(totalSim / pairs * 100) / 100 : 0;
      return {
        name,
        scripts: this.reorderSeries(group),
        track: dominantTrack,
        confidence
      };
    });
  },
  /**
   * Suggest a series name from a group of scripts.
   * Uses common theme words from titles.
   */
  suggestSeriesName(scripts) {
    const titles = scripts.map((s) => s.title);
    const commonWords = extractCommonWords(titles);
    if (commonWords.length > 0) {
      const themePhrase = commonWords.slice(0, 3).join(" ");
      return `Series: ${themePhrase.charAt(0).toUpperCase()}${themePhrase.slice(1)}`;
    }
    const first = scripts[0];
    if (first) {
      const shortened = first.title.split(/[—–\-:]/)[0]?.trim();
      return `Series: ${shortened ?? first.title}`;
    }
    return "Series: Untitled";
  },
  /**
   * Reorder scripts in a series chronologically by creation date.
   */
  reorderSeries(scripts) {
    return [...scripts].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateA - dateB;
    });
  }
};

const DUPLICATE_THRESHOLD = 0.6;
const CANDIDATE_THRESHOLD = 0.25;
const MAX_CANDIDATES = 5;
function generateTrigrams(text) {
  const normalized = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const grams = /* @__PURE__ */ new Set();
  if (normalized.length < 3) {
    grams.add(normalized);
    return grams;
  }
  for (let i = 0; i <= normalized.length - 3; i++) {
    grams.add(normalized.slice(i, i + 3));
  }
  return grams;
}
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const gram of setA) {
    if (setB.has(gram)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}
function wordOverlap(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 1));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 1));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}
function computeSimilarity(titleA, titleB) {
  const trigramSim = jaccardSimilarity(
    generateTrigrams(titleA),
    generateTrigrams(titleB)
  );
  const wordSim = wordOverlap(titleA, titleB);
  return trigramSim * 0.6 + wordSim * 0.4;
}
const duplicateDetector = {
  /**
   * Check if a title is a duplicate of any existing script.
   *
   * @param title - The new title to check
   * @param existingScripts - List of existing scripts to compare against
   * @param threshold - Custom duplicate threshold (default: 0.60)
   * @returns DuplicateCheckResult with similarity score and matching script
   *
   * @example
   * ```ts
   * const result = duplicateDetector.checkDuplicate(
   *   '5 Sai Lầm Khi Đầu Tư Crypto',
   *   existingScripts,
   * );
   * if (result.isDuplicate) {
   *   console.log(`Trùng với: "${result.similarScript.title}" (${(result.similarity * 100).toFixed(0)}%)`);
   * }
   * ```
   */
  checkDuplicate(title, existingScripts, threshold = DUPLICATE_THRESHOLD) {
    if (!title.trim() || existingScripts.length === 0) {
      return {
        isDuplicate: false,
        similarScript: null,
        similarity: 0,
        candidates: []
      };
    }
    const candidates = [];
    for (const script of existingScripts) {
      const similarity = computeSimilarity(title, script.title);
      if (similarity >= CANDIDATE_THRESHOLD) {
        candidates.push({
          id: script.id,
          title: script.title,
          similarity: Math.round(similarity * 1e3) / 1e3
        });
      }
    }
    candidates.sort((a, b) => b.similarity - a.similarity);
    const topCandidates = candidates.slice(0, MAX_CANDIDATES);
    const bestMatch = topCandidates[0] ?? null;
    return {
      isDuplicate: bestMatch !== null && bestMatch.similarity >= threshold,
      similarScript: bestMatch,
      similarity: bestMatch?.similarity ?? 0,
      candidates: topCandidates
    };
  },
  /**
   * Batch check multiple titles at once.
   * Returns results indexed by the input title.
   */
  checkBatch(titles, existingScripts, threshold = DUPLICATE_THRESHOLD) {
    const results = /* @__PURE__ */ new Map();
    for (const title of titles) {
      results.set(title, this.checkDuplicate(title, existingScripts, threshold));
    }
    return results;
  }
};

function groupBy(items, keyFn) {
  const groups = /* @__PURE__ */ new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (key === void 0) continue;
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
}
function average$1(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
function analyzeGroup(param, value, videos) {
  const ctrs = videos.map((v) => v.ctr).filter((c) => c > 0);
  const views = videos.map((v) => v.views).filter((v) => v > 0);
  const revenues = videos.map((v) => v.estimated_revenue).filter((r) => typeof r === "number" && r > 0);
  return {
    param,
    value,
    avgCTR: Math.round(average$1(ctrs) * 100) / 100,
    avgViews: Math.round(average$1(views)),
    avgRevenue: Math.round(average$1(revenues) * 100) / 100,
    sampleSize: videos.length
  };
}
const feedbackLoop = {
  /**
   * Analyze video performance grouped by generation parameters.
   * Reveals which param combinations produce the best CTR, views, and revenue.
   *
   * @example
   * ```ts
   * const analysis = feedbackLoop.analyzePerformanceByParams(videos);
   * console.log('Best persona:', analysis.byPersona[0]?.value);
   * ```
   */
  analyzePerformanceByParams(videos) {
    const validVideos = videos.filter((v) => v.ctr > 0);
    const byMode = groupBy(validVideos, (v) => v.writing_mode);
    const modePerf = [];
    for (const [mode, group] of byMode) {
      modePerf.push(analyzeGroup("writingMode", mode, group));
    }
    modePerf.sort((a, b) => b.avgCTR - a.avgCTR);
    const byPersona = groupBy(validVideos, (v) => v.persona);
    const personaPerf = [];
    for (const [persona, group] of byPersona) {
      personaPerf.push(analyzeGroup("persona", persona, group));
    }
    personaPerf.sort((a, b) => b.avgCTR - a.avgCTR);
    const byTrack = groupBy(validVideos, (v) => v.track);
    const trackPerf = [];
    for (const [track, group] of byTrack) {
      trackPerf.push(analyzeGroup("track", track, group));
    }
    trackPerf.sort((a, b) => b.avgCTR - a.avgCTR);
    const byFormula = groupBy(validVideos, (v) => v.title_formula);
    const formulaPerf = [];
    for (const [formula, group] of byFormula) {
      formulaPerf.push(analyzeGroup("titleFormula", formula, group));
    }
    formulaPerf.sort((a, b) => b.avgCTR - a.avgCTR);
    let topCombination = null;
    const combos = groupBy(
      validVideos,
      (v) => v.persona && v.writing_mode && v.track ? `${v.persona}|${v.writing_mode}|${v.track}` : void 0
    );
    let bestCTR = 0;
    for (const [key, group] of combos) {
      if (group.length < 2) continue;
      const avgCTR = average$1(group.map((v) => v.ctr));
      if (avgCTR > bestCTR) {
        bestCTR = avgCTR;
        const [persona, writingMode, track] = key.split("|");
        if (persona && writingMode && track) {
          topCombination = {
            persona,
            writingMode,
            track,
            avgCTR: Math.round(avgCTR * 100) / 100
          };
        }
      }
    }
    return {
      byWritingMode: modePerf,
      byPersona: personaPerf,
      byTrack: trackPerf,
      byTitleFormula: formulaPerf,
      topCombination
    };
  },
  /**
   * Get optimal generation parameters for a given track and/or persona.
   * Uses historical performance data to recommend the best params.
   */
  getOptimalParams(videos, constraints) {
    let filtered = videos.filter((v) => v.ctr > 0);
    if (constraints?.track) {
      filtered = filtered.filter((v) => v.track === constraints.track);
    }
    if (constraints?.persona) {
      filtered = filtered.filter((v) => v.persona === constraints.persona);
    }
    if (filtered.length === 0) {
      return {
        persona: constraints?.persona ?? "jennie_mentor",
        writingMode: "mode_1_calm",
        titleFormula: null,
        confidence: 0,
        basedOnSamples: 0
      };
    }
    const byPersona = groupBy(filtered, (v) => v.persona);
    let bestPersona = "jennie_mentor";
    let bestPersonaCTR = 0;
    for (const [persona, group] of byPersona) {
      const avgCTR = average$1(group.map((v) => v.ctr));
      if (avgCTR > bestPersonaCTR) {
        bestPersonaCTR = avgCTR;
        bestPersona = persona;
      }
    }
    const byMode = groupBy(filtered, (v) => v.writing_mode);
    let bestMode = "mode_1_calm";
    let bestModeCTR = 0;
    for (const [mode, group] of byMode) {
      const avgCTR = average$1(group.map((v) => v.ctr));
      if (avgCTR > bestModeCTR) {
        bestModeCTR = avgCTR;
        bestMode = mode;
      }
    }
    const byFormula = groupBy(filtered, (v) => v.title_formula);
    let bestFormula = null;
    let bestFormulaCTR = 0;
    for (const [formula, group] of byFormula) {
      if (group.length < 2) continue;
      const avgCTR = average$1(group.map((v) => v.ctr));
      if (avgCTR > bestFormulaCTR) {
        bestFormulaCTR = avgCTR;
        bestFormula = formula;
      }
    }
    const confidence = Math.min(1, filtered.length / 20);
    return {
      persona: constraints?.persona ?? bestPersona,
      writingMode: bestMode,
      titleFormula: bestFormula,
      confidence: Math.round(confidence * 100) / 100,
      basedOnSamples: filtered.length
    };
  }
};

const MIN_SAMPLES = 2;
const DEFAULT_CTR = 5;
const RANGE_SPREAD = 1.5;
function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
function standardDeviation(values) {
  if (values.length < 2) return 1;
  const avg = average(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / (values.length - 1));
}
const ctrPredictor = {
  /**
   * Predict CTR range based on generation parameters and historical data.
   *
   * Uses a weighted average approach:
   * 1. Groups historical videos by each parameter
   * 2. Calculates average CTR per parameter value
   * 3. Combines with weights based on sample size
   * 4. Produces estimated CTR with confidence range
   *
   * @example
   * ```ts
   * const prediction = ctrPredictor.predictCTR(
   *   { track: 'wealth', persona: 'jennie_provocateur', titleFormula: 'B_number_secret' },
   *   historicalVideos,
   * );
   * console.log(`Estimated CTR: ${prediction.rangeLow}% - ${prediction.rangeHigh}%`);
   * ```
   */
  predictCTR(params, historicalVideos) {
    const validVideos = historicalVideos.filter((v) => v.ctr > 0);
    if (validVideos.length === 0) {
      return {
        estimated: DEFAULT_CTR,
        rangeLow: DEFAULT_CTR * 0.5,
        rangeHigh: DEFAULT_CTR * 1.5,
        confidence: 0,
        sampleSize: 0,
        factors: []
      };
    }
    const factors = [];
    if (params.track) {
      const matched = validVideos.filter((v) => v.track === params.track);
      if (matched.length >= MIN_SAMPLES) {
        const ctrs = matched.map((v) => v.ctr);
        factors.push({
          name: "Track",
          value: params.track,
          avgCTR: Math.round(average(ctrs) * 100) / 100,
          weight: 1,
          sampleSize: matched.length
        });
      }
    }
    if (params.persona) {
      const matched = validVideos.filter((v) => v.persona === params.persona);
      if (matched.length >= MIN_SAMPLES) {
        const ctrs = matched.map((v) => v.ctr);
        factors.push({
          name: "Persona",
          value: params.persona,
          avgCTR: Math.round(average(ctrs) * 100) / 100,
          weight: 1.2,
          sampleSize: matched.length
        });
      }
    }
    if (params.writingMode) {
      const matched = validVideos.filter((v) => v.writing_mode === params.writingMode);
      if (matched.length >= MIN_SAMPLES) {
        const ctrs = matched.map((v) => v.ctr);
        factors.push({
          name: "Writing Mode",
          value: params.writingMode,
          avgCTR: Math.round(average(ctrs) * 100) / 100,
          weight: 0.8,
          sampleSize: matched.length
        });
      }
    }
    if (params.titleFormula) {
      const matched = validVideos.filter((v) => v.title_formula === params.titleFormula);
      if (matched.length >= MIN_SAMPLES) {
        const ctrs = matched.map((v) => v.ctr);
        factors.push({
          name: "Title Formula",
          value: params.titleFormula,
          avgCTR: Math.round(average(ctrs) * 100) / 100,
          weight: 1.5,
          sampleSize: matched.length
        });
      }
    }
    if (params.thumbnailPalette) {
      const matched = validVideos.filter((v) => v.thumbnail_palette === params.thumbnailPalette);
      if (matched.length >= MIN_SAMPLES) {
        const ctrs = matched.map((v) => v.ctr);
        factors.push({
          name: "Thumbnail Palette",
          value: params.thumbnailPalette,
          avgCTR: Math.round(average(ctrs) * 100) / 100,
          weight: 1.3,
          sampleSize: matched.length
        });
      }
    }
    if (factors.length === 0) {
      const allCTRs = validVideos.map((v) => v.ctr);
      const globalAvg = average(allCTRs);
      const globalStd = standardDeviation(allCTRs);
      return {
        estimated: Math.round(globalAvg * 100) / 100,
        rangeLow: Math.round(Math.max(0, globalAvg - globalStd * RANGE_SPREAD) * 100) / 100,
        rangeHigh: Math.round((globalAvg + globalStd * RANGE_SPREAD) * 100) / 100,
        confidence: 0.1,
        sampleSize: validVideos.length,
        factors: []
      };
    }
    let weightedSum = 0;
    let totalWeight = 0;
    let totalSamples = 0;
    for (const factor of factors) {
      const sizeWeight = Math.log2(factor.sampleSize + 1);
      const effectiveWeight = factor.weight * sizeWeight;
      weightedSum += factor.avgCTR * effectiveWeight;
      totalWeight += effectiveWeight;
      totalSamples += factor.sampleSize;
    }
    const estimated = totalWeight > 0 ? weightedSum / totalWeight : DEFAULT_CTR;
    const factorCTRs = factors.map((f) => f.avgCTR);
    const factorStd = factorCTRs.length > 1 ? standardDeviation(factorCTRs) : estimated * 0.2;
    const rangeLow = Math.max(0, estimated - factorStd * RANGE_SPREAD);
    const rangeHigh = estimated + factorStd * RANGE_SPREAD;
    const factorConfidence = Math.min(1, factors.length / 4);
    const sampleConfidence = Math.min(1, totalSamples / 30);
    const confidence = factorConfidence * 0.4 + sampleConfidence * 0.6;
    return {
      estimated: Math.round(estimated * 100) / 100,
      rangeLow: Math.round(rangeLow * 100) / 100,
      rangeHigh: Math.round(rangeHigh * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      sampleSize: totalSamples,
      factors
    };
  }
};

const EMOTIONAL_KEYWORDS = [
  "sợ hãi",
  "đau",
  "mất",
  "khóc",
  "yêu",
  "ghét",
  "giận",
  "tuyệt vọng",
  "hạnh phúc",
  "hy vọng",
  "shock",
  "sốc",
  "bất ngờ",
  "kinh hoàng",
  "cảm ơn",
  "tha thứ",
  "xin lỗi",
  "buông bỏ",
  "thức tỉnh",
  "giác ngộ",
  "nghẹn ngào",
  "rung động",
  "run rẩy",
  "lạnh sống lưng",
  "tim đập",
  "nỗi đau",
  "nước mắt",
  "ôm",
  "chữa lành",
  "phá vỡ",
  "tan nát"
];
const HOOK_PATTERNS = [
  /bạn có (?:bao giờ|biết|tin)/i,
  /sự thật (?:là|mà|đáng sợ)/i,
  /không ai (?:nói|dám|dạy)/i,
  /tại sao (?:bạn|người|ai)/i,
  /bí mật/i,
  /\d+ (?:sai lầm|điều|cách|bước|lý do)/i,
  /dừng lại/i,
  /hãy (?:tưởng tượng|nghĩ|nhìn)/i,
  /câu chuyện (?:này|của|mà)/i,
  /nếu (?:bạn|ai|ngày)/i,
  /vì sao/i,
  /jennie (?:từng|đã|cũng)/i
];
const VISUAL_KEYWORDS = [
  "hãy tưởng tượng",
  "nhìn",
  "thấy",
  "ánh sáng",
  "bóng tối",
  "biển",
  "núi",
  "mặt trời",
  "ngọn nến",
  "gương",
  "cánh cửa",
  "con đường",
  "dòng sông",
  "ngã tư",
  "chart",
  "biểu đồ",
  "cánh chim",
  "ngọn lửa",
  "hạt giống",
  "cây",
  "vườn"
];
const CONTEXT_INDICATORS = [
  "bởi vì",
  "tại vì",
  "cho nên",
  "vì vậy",
  "nghĩa là",
  "ví dụ",
  "đơn giản",
  "nói cách khác",
  "tóm lại"
];
function countMatches(text, keywords) {
  const lowerText = text.toLowerCase();
  let count = 0;
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      count++;
    }
  }
  return count;
}
function countPatternMatches(text, patterns) {
  let count = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) count++;
  }
  return count;
}
function countWords(text) {
  return text.split(/\s+/).filter((t) => t.length > 0).length;
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function extractSections(text) {
  const parts = text.split(/^##\s+(.+)$/m);
  const sections = [];
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i]?.trim() ?? "";
    const content = parts[i + 1]?.trim() ?? "";
    if (title && content) {
      sections.push({ title, content });
    }
  }
  return sections;
}
const clipScorer = {
  /**
   * Score a text section for short clip potential (0-10).
   *
   * @example
   * ```ts
   * const score = clipScorer.scoreSection('Bạn có biết 95% trader thua lỗ? Sự thật mà không ai dám nói.');
   * console.log(score.score); // e.g., 8.2
   * ```
   */
  scoreSection(text) {
    const wordCount = countWords(text);
    const emotionalCount = countMatches(text, EMOTIONAL_KEYWORDS);
    const emotionalIntensity = clamp(emotionalCount * 2, 0, 10);
    const hookMatches = countPatternMatches(text, HOOK_PATTERNS);
    const firstSentence = text.split(/[.!?]\s/)[0] ?? "";
    const firstSentenceHook = countPatternMatches(firstSentence, HOOK_PATTERNS) > 0 ? 3 : 0;
    const hookQuality = clamp(hookMatches * 2 + firstSentenceHook, 0, 10);
    const contextCount = countMatches(text, CONTEXT_INDICATORS);
    const hasQuestion = /\?/.test(text);
    const hasConclusion = /vì vậy|cho nên|tóm lại|nghĩa là/i.test(text);
    const standaloneClarity = clamp(
      contextCount * 1.5 + (hasQuestion ? 2 : 0) + (hasConclusion ? 2 : 0) + 3,
      0,
      10
    );
    let brevity;
    if (wordCount <= 30) {
      brevity = 6;
    } else if (wordCount <= 80) {
      brevity = 10;
    } else if (wordCount <= 150) {
      brevity = 7;
    } else if (wordCount <= 250) {
      brevity = 4;
    } else {
      brevity = 2;
    }
    const visualCount = countMatches(text, VISUAL_KEYWORDS);
    const visualPotential = clamp(visualCount * 2, 0, 10);
    const overall = emotionalIntensity * 0.25 + hookQuality * 0.3 + standaloneClarity * 0.15 + brevity * 0.15 + visualPotential * 0.15;
    const roundedScore = Math.round(overall * 10) / 10;
    const explanationParts = [];
    if (hookQuality >= 7) explanationParts.push("Hook mạnh");
    else if (hookQuality <= 3) explanationParts.push("Thiếu hook gây chú ý");
    if (emotionalIntensity >= 7) explanationParts.push("Cảm xúc mãnh liệt");
    if (brevity >= 8) explanationParts.push("Độ dài lý tưởng cho clip");
    else if (brevity <= 4) explanationParts.push("Quá dài, cần cắt ngắn");
    if (visualPotential >= 6) explanationParts.push("Giàu hình ảnh");
    return {
      score: roundedScore,
      factors: {
        emotionalIntensity,
        standaloneClarity,
        hookQuality,
        brevity,
        visualPotential
      },
      text: text.length > 200 ? text.slice(0, 200) + "..." : text,
      explanation: explanationParts.length > 0 ? explanationParts.join(". ") + "." : "Điểm trung bình, có thể cải thiện hook và cảm xúc."
    };
  },
  /**
   * Suggest the best sections from a full script for short clips.
   * Splits by ## headers, scores each section, returns top N.
   *
   * @param script - Full markdown script
   * @param count - Number of clips to suggest (default: 3)
   */
  suggestBestClips(script, count = 3) {
    const sections = extractSections(script);
    if (sections.length === 0) {
      const score = this.scoreSection(script);
      return [{
        sectionIndex: 0,
        sectionTitle: "Toàn bộ nội dung",
        clipText: script,
        score
      }];
    }
    const scored = sections.map((section, index) => ({
      sectionIndex: index,
      sectionTitle: section.title,
      clipText: section.content,
      score: this.scoreSection(section.content)
    }));
    scored.sort((a, b) => b.score.score - a.score.score);
    return scored.slice(0, count);
  }
};

function isTauriEnvironment() {
  return !!window.__TAURI_INTERNALS__;
}
async function getTauriInvoke() {
  if (!isTauriEnvironment()) {
    throw new Error("Chức năng này chỉ khả dụng trên Desktop");
  }
  const mod = await Function('return import("@tauri-apps/api/core")')();
  return mod.invoke;
}
async function transcribe(audioPath, onProgress, modelPath = "D:\\GEM-Content-Agent\\models\\ggml-base.bin") {
  const invoke = await getTauriInvoke();
  try {
    onProgress?.({
      stage: "transcribing",
      percent: 10,
      message: "Starting Whisper transcription..."
    });
    const result = await invoke("transcribe_audio", {
      audioPath,
      modelPath
    });
    onProgress?.({
      stage: "complete",
      percent: 100,
      message: "Transcription complete"
    });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    onProgress?.({
      stage: "error",
      percent: 0,
      message: errorMessage
    });
    throw new Error(`Transcription failed: ${errorMessage}`);
  }
}
async function transcribeVideo(videoPath, onProgress, modelPath = "D:\\GEM-Content-Agent\\models\\ggml-base.bin") {
  const invoke = await getTauriInvoke();
  onProgress?.({
    stage: "extracting",
    percent: 5,
    message: "Extracting audio from video..."
  });
  const audioOutputPath = videoPath.replace(/\.[^.]+$/, "_extracted.wav");
  await invoke("extract_audio", {
    videoPath,
    outputPath: audioOutputPath
  });
  onProgress?.({
    stage: "extracting",
    percent: 30,
    message: "Audio extraction complete"
  });
  return transcribe(audioOutputPath, onProgress, modelPath);
}
async function checkModelAvailable(modelPath = "D:\\GEM-Content-Agent\\models\\ggml-base.bin") {
  const invoke = await getTauriInvoke();
  return invoke("check_whisper_model", { modelPath });
}
async function checkFfmpegAvailable() {
  const invoke = await getTauriInvoke();
  return invoke("check_ffmpeg_installed");
}
async function getVideoInfo(path) {
  const invoke = await getTauriInvoke();
  return invoke("get_video_info", { path });
}
async function sendNotification(title, body) {
  const invoke = await getTauriInvoke();
  await invoke("send_os_notification", { title, body });
}

const STALE_TIMES = {
  /** Scripts: 5 minutes — moderate frequency of changes */
  scripts: 5 * 60 * 1e3,
  /** Titles: 5 minutes */
  titles: 5 * 60 * 1e3,
  /** Social posts: 5 minutes */
  socialPosts: 5 * 60 * 1e3,
  /** Image prompts: 5 minutes */
  imagePrompts: 5 * 60 * 1e3,
  /** Calendar events: 30 seconds — frequently updated, needs near-realtime */
  calendarEvents: 30 * 1e3,
  /** Analytics data: 1 hour — YouTube data updates slowly */
  analytics: 60 * 60 * 1e3,
  /** AI insights: 1 hour — generated weekly */
  insights: 60 * 60 * 1e3,
  /** Brand rules: 24 hours — rarely changes */
  brandRules: 24 * 60 * 60 * 1e3,
  /** Profiles: 10 minutes */
  profiles: 10 * 60 * 1e3,
  /** Notifications: 30 seconds — near-realtime */
  notifications: 30 * 1e3,
  /** Dashboard stats: 2 minutes */
  dashboardStats: 2 * 60 * 1e3,
  /** Generation jobs: 10 seconds — need live status */
  generationJobs: 10 * 1e3
};
const CACHE_TIMES = {
  /** Short-lived: 5 minutes */
  short: 5 * 60 * 1e3,
  /** Medium: 30 minutes */
  medium: 30 * 60 * 1e3,
  /** Long: 1 hour */
  long: 60 * 60 * 1e3,
  /** Persistent: 24 hours (brand rules, rarely changing data) */
  persistent: 24 * 60 * 60 * 1e3
};
const queryKeys = {
  scripts: {
    all: ["scripts"],
    list: (params) => ["scripts", "list", params],
    detail: (id) => ["scripts", "detail", id],
    stats: ["scripts", "stats"]
  },
  titles: {
    all: ["titles"],
    byScript: (scriptId) => ["titles", "byScript", scriptId]
  },
  socialPosts: {
    all: ["socialPosts"],
    list: (params) => ["socialPosts", "list", params],
    byCampaign: (campaignName) => ["socialPosts", "campaign", campaignName]
  },
  imagePrompts: {
    all: ["imagePrompts"],
    byScript: (scriptId) => ["imagePrompts", "byScript", scriptId]
  },
  calendar: {
    all: ["calendar"],
    byRange: (start, end) => ["calendar", "range", start, end],
    thisWeek: ["calendar", "thisWeek"],
    distribution: ["calendar", "distribution"]
  },
  analytics: {
    all: ["analytics"],
    videos: ["analytics", "videos"],
    insights: ["analytics", "insights"],
    latestInsight: ["analytics", "latestInsight"],
    retention: (videoId) => ["analytics", "retention", videoId]
  },
  brandRules: {
    all: ["brandRules"]
  },
  notifications: {
    all: ["notifications"],
    unread: ["notifications", "unread"],
    count: ["notifications", "count"]
  },
  generationJobs: {
    all: ["generationJobs"],
    active: ["generationJobs", "active"],
    detail: (id) => ["generationJobs", "detail", id]
  },
  profiles: {
    current: ["profiles", "current"]
  }
};
const prefetchHints = {
  "/dashboard": ["scripts.stats", "calendar.thisWeek", "notifications.count"],
  "/ai-gen": ["scripts.list", "brandRules.all"],
  "/latc": ["scripts.list", "brandRules.all"],
  "/tmt": ["scripts.list", "brandRules.all"],
  "/calendar": ["calendar.thisWeek", "calendar.distribution"],
  "/analytics": ["analytics.videos", "analytics.latestInsight"],
  "/repurpose": ["scripts.list"],
  "/brand": ["brandRules.all"]
};

export { CACHE_TIMES, CTA_PATTERNS, FUNNELS, STALE_TIMES, activityService, anomalyDetector, authService, backupService, brandVoiceChecker, buildSystemPrompt$1 as buildSystemPrompt, calendarService, cascadingPipeline, claudeService, clipScorer, contentClassifier, create as createNotification, ctaRulesEngine, ctrPredictor, duplicateDetector, exportService, feedbackLoop, getGemFeatures, getPersonaDescription, getProfile, getSession, getStructureForType, getSupabase, getTermConversions, getTrackDescription, getCount as getUnreadNotificationCount, getUnread as getUnreadNotifications, imagePromptService, jobQueue, jobRunner, log as logActivity, markAllRead as markAllNotificationsRead, markAsRead as markNotificationAsRead, modelRouter, notificationService, onAuthStateChange, onboardingService, onboardingSteps, plannerService, prefetchHints, queryKeys, repurposeEngine, resetPassword, schedulerService, scriptGenerator, scriptService, sendNotification as sendDesktopNotification, seriesLinker, signIn, signOut, signUp, slugGenerator, socialPostService, syncService, titleGenerator, titleService, updateProfile, vietnameseNLP, webhookService, checkFfmpegAvailable as whisperCheckFfmpeg, checkModelAvailable as whisperCheckModel, getVideoInfo as whisperGetVideoInfo, transcribe as whisperTranscribe, transcribeVideo as whisperTranscribeVideo };
