// Phase 0: Notification sound hook
// Plays sound on new inbound message when tab not focused

import { useEffect, useRef, useCallback } from "react";
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

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number>(0);
  const MIN_INTERVAL = 3000; // 3s minimum between sounds

  useEffect(() => {
    // Preload sound — use a simple base64-encoded beep if no file exists
    audioRef.current = new Audio("/sounds/notification.mp3");
    audioRef.current.volume = 0.5;

    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel("notification-sound")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "channel_pending_messages" },
        async (payload) => {
          const msg = payload.new as any;
          // Only play for inbound customer messages, not agent messages
          if (msg.status === "handled" || document.hasFocus()) return;
          // Bỏ qua hội thoại đã TẮT THÔNG BÁO (mute). Hook realtime này là nguồn noti
          // độc lập với UnifiedInbox nên phải tự kiểm mute.
          // Lookup theo chat_id (= thread_id, Zalo id duy nhất): pending.session_key NULL
          // và channel_sessions.channel_name có thể NULL → chat_id là khoá tin cậy nhất.
          if (msg.thread_id) {
            try {
              const { data: muted } = await sb
                .from("channel_sessions")
                .select("is_muted")
                .eq("chat_id", msg.thread_id)
                .eq("is_muted", true)
                .limit(1);
              if (muted && muted.length > 0) return; // muted → không phát sound + không notification
            } catch {
              // lookup lỗi → vẫn phát (an toàn: không nuốt noti vì lỗi mạng)
            }
          }
          playSound();
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  const playSound = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayedRef.current < MIN_INTERVAL) return;
    lastPlayedRef.current = now;

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Browser blocks autoplay — ignore
      });
    }

    // Browser notification
    if (Notification.permission === "granted") {
      new Notification("Gemral — Tin nhắn mới", {
        body: "Bạn có tin nhắn mới từ khách hàng",
        icon: "/favicon.ico",
        silent: true,
      });
    }
  }, []);

  const requestPermission = useCallback(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return { play: playSound, playSound, requestPermission };
}
