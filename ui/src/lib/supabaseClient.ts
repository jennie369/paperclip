// Supabase client singleton for Paperclip UI
// Used by src/gem/adapters/supabase-compat.js (CC packages)
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env ?? {};

const supabaseUrl: string =
  env.VITE_SUPABASE_URL ??
  env.VITE_GEMRAL_SUPABASE_URL ??
  "";
const supabaseKey: string =
  env.VITE_SUPABASE_ANON_KEY ??
  env.VITE_GEMRAL_SUPABASE_ANON_KEY ??
  "";

if (!supabaseUrl || !supabaseKey) {
  console.warn("[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
