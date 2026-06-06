// Phase 0: Realtime unread count hook
// Subscribes to channel_sessions changes, updates badge + document title

import { useEffect, useState, useCallback } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env ?? {};

const supabaseUrl: string = env.VITE_SUPABASE_URL ?? env.VITE_GEMRAL_SUPABASE_URL ?? "";
const supabaseKey: string = env.VITE_SUPABASE_ANON_KEY ?? env.VITE_GEMRAL_SUPABASE_ANON_KEY ?? "";

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) return null;
  if (!_supabase) _supabase = createClient(supabaseUrl, supabaseKey);
  return _supabase;
}

export function useUnreadCount() {
  const [totalUnread, setTotalUnread] = useState(0);
  const [byChannel, setByChannel] = useState<Record<string, number>>({});

  const loadCounts = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;

    const { data } = await sb
      .from("channel_sessions")
      .select("channel_name, unread_count")
      .gt("unread_count", 0)
      .eq("is_deleted", false)
      // Muted conversations must not contribute to the sidebar badge or the
      // browser-tab title count. `not is true` matches both false and NULL so
      // un-muted rows (default) are still counted.
      .not("is_muted", "is", true);

    const rows = data || [];
    const total = rows.reduce((sum, s) => sum + (s.unread_count || 0), 0);
    const grouped: Record<string, number> = {};
    rows.forEach((s) => {
      const ch = s.channel_name || "_unknown";
      grouped[ch] = (grouped[ch] || 0) + (s.unread_count || 0);
    });

    setTotalUnread(total);
    setByChannel(grouped);

    // Update document title
    document.title = total > 0 ? `(${total}) Gemral Dashboard` : "Gemral Dashboard";
  }, []);

  useEffect(() => {
    loadCounts();

    const sb = getSupabase();
    if (!sb) return;

    // Realtime subscription for updates
    const channel = sb
      .channel("unread-counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channel_sessions" },
        () => {
          loadCounts();
        }
      )
      .subscribe();

    // Poll as fallback every 30s
    const interval = setInterval(loadCounts, 30_000);

    return () => {
      sb.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadCounts]);

  return { totalUnread, byChannel, refresh: loadCounts };
}
