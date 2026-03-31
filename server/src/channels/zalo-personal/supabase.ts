// Standalone Supabase client for Zalo Personal channel
// Connects to Gemral Supabase (pgfkbcnzqozzkohwbgbk), not Paperclip's embedded DB

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pgfkbcnzqozzkohwbgbk.supabase.co';
const SUPABASE_KEY = process.env.GEMRAL_SUPABASE_SERVICE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZmtiY256cW96emtvaHdiZ2JrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE3NzUzNiwiZXhwIjoyMDc3NzUzNTM2fQ.pI9VjPhcl0sds1mcPsa5nnRv6ODDHbI29Q1ViMLoEQg';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _client;
}

// Proxy object for backward-compatible `supabase.from(...)` usage
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});
