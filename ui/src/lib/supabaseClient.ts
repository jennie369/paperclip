// Supabase client singleton for Paperclip UI
// Used by src/gem/adapters/supabase-compat.js (CC packages)
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env ?? {};

const supabaseUrl: string =
  env.VITE_SUPABASE_URL ??
  env.VITE_GEMRAL_SUPABASE_URL ??
  "https://pgfkbcnzqozzkohwbgbk.supabase.co";
const supabaseKey: string =
  env.VITE_SUPABASE_ANON_KEY ??
  env.VITE_GEMRAL_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZmtiY256cW96emtvaHdiZ2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzc1MzYsImV4cCI6MjA3Nzc1MzUzNn0.1De0-m3GhFHUrKl-ViqX_r6bydVFoWDaW8DsxhhbjEc";

if (!supabaseUrl || !supabaseKey) {
  console.warn("[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
