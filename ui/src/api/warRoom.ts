/**
 * War Room API — Direct Supabase queries for agent communication channels.
 * Supports both Paperclip standalone (GEMRAL_SUPABASE_*) and Gemral frontend (VITE_SUPABASE_*).
 * Client is created lazily to avoid crashing when env vars are missing at module load.
 */

import { createClient, type SupabaseClient, type RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env ?? {};

// Resolve Supabase credentials from available env vars
// Paperclip standalone: injected via VITE_ prefix in ui/.env
// Gemral frontend mount: from frontend/.env.local
const supabaseUrl: string =
  env.VITE_SUPABASE_URL ??
  env.VITE_GEMRAL_SUPABASE_URL ??
  "";
const supabaseKey: string =
  env.VITE_SUPABASE_ANON_KEY ??
  env.VITE_GEMRAL_SUPABASE_ANON_KEY ??
  "";

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("War Room: Supabase credentials not configured. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.");
    }
    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

export interface WarRoomChannel {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  is_default?: boolean;
  channel_type?: string;
  icon?: string;
  color?: string;
  created_by?: string;
  project_id?: string | null;
  goal_id?: string | null;
  is_archived?: boolean;
  is_private?: boolean;
  auto_created?: boolean;
  settings?: Record<string, unknown>;
  created_at?: string;
}

export interface CreateChannelParams {
  name: string;
  display_name: string;
  description: string;
  channel_type: string;
  icon: string;
  color: string;
  is_private: boolean;
  is_default: boolean;
  project_id: string | null;
  goal_id: string | null;
  created_by: string;
  settings: Record<string, unknown>;
  members: string[];
}

export interface WarRoomMessage {
  id: string;
  channel_id: string;
  sender_type: "agent" | "owner" | "system";
  sender_id?: string;
  sender_name: string;
  message_type: string;
  content: string;
  priority?: string | null;
  is_pinned: boolean;
  reply_to?: string | null;
  created_at: string;
}

const DEFAULT_CHANNELS: WarRoomChannel[] = [
  { id: "general", name: "general", description: "Tin nhắn chung của team" },
  { id: "skills", name: "skills", description: "Cập nhật skill & công cụ" },
  { id: "research", name: "research", description: "Nghiên cứu & phân tích" },
  { id: "incidents", name: "incidents", description: "Sự cố & xử lý" },
  { id: "standup", name: "standup", description: "Báo cáo tiến độ hàng ngày" },
  { id: "learning-room", name: "learning-room", description: "Đào tạo & học tập" },
];

export const warRoomApi = {
  async getChannels(): Promise<WarRoomChannel[]> {
    try {
      const { data, error } = await getSupabase()
        .from("war_room_channels")
        .select("*")
        .eq("is_archived", false)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data && data.length > 0 ? data : DEFAULT_CHANNELS;
    } catch {
      return DEFAULT_CHANNELS;
    }
  },

  async getMessages(channelId: string, limit = 80): Promise<WarRoomMessage[]> {
    try {
      const { data, error } = await getSupabase()
        .from("war_room_messages")
        .select("*")
        .eq("channel_id", channelId)
        .is("reply_to", null)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    } catch {
      return [];
    }
  },

  async getThread(parentId: string): Promise<WarRoomMessage[]> {
    try {
      const { data, error } = await getSupabase()
        .from("war_room_messages")
        .select("*")
        .eq("reply_to", parentId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    } catch {
      return [];
    }
  },

  async getPinned(channelId: string): Promise<WarRoomMessage[]> {
    try {
      const { data, error } = await getSupabase()
        .from("war_room_messages")
        .select("*")
        .eq("channel_id", channelId)
        .eq("is_pinned", true)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    } catch {
      return [];
    }
  },

  async sendMessage(payload: {
    channelId: string;
    content: string;
    messageType?: string;
    replyTo?: string | null;
  }): Promise<WarRoomMessage | null> {
    try {
      const { data, error } = await getSupabase()
        .from("war_room_messages")
        .insert({
          channel_id: payload.channelId,
          sender_type: "owner",
          sender_id: "local-board",
          sender_name: "Board",
          message_type: payload.messageType ?? "text",
          content: payload.content,
          priority: null,
          reply_to: payload.replyTo ?? null,
          is_pinned: false,
        })
        .select()
        .single();
      if (error) throw error;

      // Trigger agent wakeups for all members in this channel
      if (data) {
        void this._wakeWarRoomAgents(payload.channelId, data.id, payload.content);
      }

      return data;
    } catch {
      return null;
    }
  },

  /** Wake CEO agent only — CEO delegates to other agents as needed.
   *  Previous approach woke ALL channel members (23 agents!) which exhausted resources. */
  async _wakeWarRoomAgents(channelId: string, messageId: string, content: string): Promise<void> {
    try {
      // Only wake CEO agent — prevents resource exhaustion from mass spawning
      const { data: ceo } = await getSupabase()
        .from("agents")
        .select("id, slug, company_id")
        .eq("role", "ceo")
        .not("status", "eq", "terminated")
        .limit(1)
        .single();

      if (!ceo) return;

      const { agentsApi } = await import("./agents");

      await agentsApi.wakeup(
        ceo.id,
        {
          source: "on_demand",
          triggerDetail: "system",
          reason: `War Room #${channelId}: ${content.slice(0, 100)}`,
          payload: { channelId, messageId, content: content.slice(0, 500) },
        },
        ceo.company_id,
      );
    } catch {
      // War Room trigger is best-effort
    }
  },

  async pinMessage(messageId: string, pinned: boolean): Promise<void> {
    await getSupabase()
      .from("war_room_messages")
      .update({ is_pinned: pinned })
      .eq("id", messageId);
  },

  async getReplyCount(messageId: string): Promise<number> {
    try {
      const { count, error } = await getSupabase()
        .from("war_room_messages")
        .select("id", { count: "exact", head: true })
        .eq("reply_to", messageId);
      if (error) throw error;
      return count ?? 0;
    } catch {
      return 0;
    }
  },

  subscribeToChannel(
    channelId: string,
    onMessage: (msg: WarRoomMessage, eventType?: string) => void,
  ) {
    return getSupabase()
      .channel(`warroom:${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "war_room_messages", filter: `channel_id=eq.${channelId}` },
        (payload: RealtimePostgresChangesPayload<WarRoomMessage>) => onMessage(payload.new as WarRoomMessage),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "war_room_messages", filter: `channel_id=eq.${channelId}` },
        (payload: RealtimePostgresChangesPayload<WarRoomMessage>) => onMessage(payload.new as WarRoomMessage, "update"),
      )
      .subscribe();
  },

  // ─── Channel CRUD ─────────────────────────────────────────

  async createChannel(params: CreateChannelParams & { agentNames?: Record<string, string> }): Promise<WarRoomChannel> {
    const { members, agentNames, ...channelData } = params;
    const { data: channel, error } = await getSupabase()
      .from("war_room_channels")
      .insert(channelData)
      .select()
      .single();
    if (error) throw error;

    if (members.length > 0) {
      const rows = members.map((slug) => ({
        channel_id: channel.id,
        agent_slug: slug,
        agent_name: agentNames?.[slug] ?? slug,
        role: "member",
      }));
      await getSupabase().from("war_room_members").insert(rows);
    }

    // Welcome message with agent names
    const memberNames = members.map((s) => agentNames?.[s] ?? s).join(", ");
    await getSupabase().from("war_room_messages").insert({
      channel_id: channel.id,
      sender_type: "system",
      sender_id: "system",
      sender_name: "Hệ thống",
      message_type: "status",
      content: members.length > 0
        ? `Phòng #${params.name} đã được tạo. ${members.length} agents tham gia: ${memberNames}.`
        : `Phòng #${params.name} đã được tạo.`,
      priority: 3,
    });

    return channel;
  },

  async updateChannel(channelId: string, updates: Partial<WarRoomChannel>): Promise<WarRoomChannel> {
    const { data, error } = await getSupabase()
      .from("war_room_channels")
      .update(updates)
      .eq("id", channelId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async archiveChannel(channelId: string): Promise<void> {
    await getSupabase()
      .from("war_room_channels")
      .update({ is_archived: true })
      .eq("id", channelId);
  },

  async deleteChannel(channelId: string): Promise<void> {
    await getSupabase().from("war_room_members").delete().eq("channel_id", channelId);
    await getSupabase().from("war_room_messages").delete().eq("channel_id", channelId);
    await getSupabase().from("war_room_channels").delete().eq("id", channelId);
  },

  async getChannelMembers(channelId: string): Promise<Array<{ agent_slug: string; role: string }>> {
    const { data } = await getSupabase()
      .from("war_room_members")
      .select("agent_slug, role")
      .eq("channel_id", channelId);
    return data ?? [];
  },

  async addMember(channelId: string, agentSlug: string): Promise<void> {
    await getSupabase().from("war_room_members").upsert(
      { channel_id: channelId, agent_slug: agentSlug, role: "member" },
      { onConflict: "channel_id,agent_slug" },
    );
  },

  async removeMember(channelId: string, agentSlug: string): Promise<void> {
    await getSupabase()
      .from("war_room_members")
      .delete()
      .match({ channel_id: channelId, agent_slug: agentSlug });
  },

  // ─── Paperclip data fetchers ──────────────────────────────

  async getProjects(): Promise<Array<{ id: string; name: string }>> {
    try {
      const { data } = await getSupabase()
        .from("projects")
        .select("id, name")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    } catch {
      return [];
    }
  },

  async getGoals(): Promise<Array<{ id: string; title: string }>> {
    try {
      const { data } = await getSupabase()
        .from("goals")
        .select("id, title")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    } catch {
      return [];
    }
  },

  async getAgents(): Promise<Array<{ id: string; name: string; slug: string }>> {
    try {
      const { data } = await getSupabase()
        .from("agents")
        .select("id, name, role")
        .not("status", "eq", "terminated")
        .order("name", { ascending: true });
      // Paperclip uses role as slug for known roles (ceo, cto, cmo, designer, researcher)
      // For "general" role agents, slugify the name (e.g., "Sales Closer" → "sales-closer")
      return (data ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        slug: (a.role && a.role !== "general")
          ? a.role
          : a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      }));
    } catch {
      return [];
    }
  },

  subscribeToChannels(onUpdate: (channel: WarRoomChannel, eventType: string) => void) {
    return getSupabase()
      .channel("warroom:channels")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "war_room_channels" },
        (payload: RealtimePostgresChangesPayload<WarRoomChannel>) => onUpdate(payload.new as WarRoomChannel, "insert"),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "war_room_channels" },
        (payload: RealtimePostgresChangesPayload<WarRoomChannel>) => onUpdate(payload.new as WarRoomChannel, "update"),
      )
      .subscribe();
  },
};
