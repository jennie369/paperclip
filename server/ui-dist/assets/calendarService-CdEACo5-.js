import { aC as getSupabase } from './index-C7HOhyqm.js';

const calendarService = {
  /** Get events for a date range */
  async getByDateRange(startDate, endDate, filters) {
    try {
      const supabase = getSupabase();
      let query = supabase.from("cc_calendar_events").select("*").gte("scheduled_date", startDate).lte("scheduled_date", endDate);
      if (filters?.track) query = query.eq("track", filters.track);
      if (filters?.contentType) query = query.eq("content_type", filters.contentType);
      if (filters?.status) query = query.eq("status", filters.status);
      query = query.order("scheduled_date", { ascending: true });
      const { data, error } = await query;
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: data ?? [], error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải lịch";
      return { data: null, error: message, success: false };
    }
  },
  /** Get single event */
  async getById(id) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_calendar_events").select("*").eq("id", id).single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải sự kiện";
      return { data: null, error: message, success: false };
    }
  },
  /** Create event */
  async create(event) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_calendar_events").insert(event).select().single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tạo sự kiện";
      return { data: null, error: message, success: false };
    }
  },
  /** Update event */
  async update(id, updates) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("cc_calendar_events").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single();
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi cập nhật sự kiện";
      return { data: null, error: message, success: false };
    }
  },
  /** Update status */
  async updateStatus(id, status) {
    return this.update(id, { status });
  },
  /** Delete event */
  async remove(id) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("cc_calendar_events").delete().eq("id", id);
      if (error) {
        return { data: null, error: error.message, success: false };
      }
      return { data: null, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi xóa sự kiện";
      return { data: null, error: message, success: false };
    }
  },
  /** Get this week's events */
  async getThisWeek() {
    const now = /* @__PURE__ */ new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return this.getByDateRange(
      startOfWeek.toISOString().split("T")[0] ?? "",
      endOfWeek.toISOString().split("T")[0] ?? ""
    );
  },
  /** Get track distribution for a month */
  async getTrackDistribution(month) {
    try {
      const startDate = `${month}-01`;
      const endDate = new Date(
        Number(month.split("-")[0]),
        Number(month.split("-")[1]),
        0
      ).toISOString().split("T")[0] ?? "";
      const { data: events, error } = await this.getByDateRange(startDate, endDate);
      if (error || !events) {
        return { data: null, error: error ?? "Lỗi", success: false };
      }
      const distribution = {
        wealth: 0,
        wellness: 0,
        integration: 0
      };
      for (const event of events) {
        distribution[event.track]++;
      }
      return { data: distribution, error: null, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tính phân bố";
      return { data: null, error: message, success: false };
    }
  }
};

export { calendarService as c };
