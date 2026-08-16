// Standalone Supabase client for Zalo Personal channel
// Connects to Gemral Supabase (pgfkbcnzqozzkohwbgbk), not Paperclip's embedded DB

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pgfkbcnzqozzkohwbgbk.supabase.co';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    // Đọc key LAZY (lúc request đầu — sau khi dotenv đã nạp) + KHÔNG fallback hardcode.
    const key = process.env.GEMRAL_SUPABASE_SERVICE_KEY;
    if (!key) {
      throw new Error('[supabase] GEMRAL_SUPABASE_SERVICE_KEY chưa set — bắt buộc (service_role, không còn fallback hardcode).');
    }
    _client = createClient(SUPABASE_URL, key);
  }
  return _client;
}

// Proxy object for backward-compatible `supabase.from(...)` usage
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});
