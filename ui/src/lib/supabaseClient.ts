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

// GEM-1069: 2 bảng PII/tốn tiền KHÔNG còn policy anon → REST của chúng đi qua server Paperclip
// (service_role, server/src/channels/cc-db-proxy.ts). Consumer `supabase.from('cc_email_sends')…` giữ nguyên.
const CC_PROXIED_TABLES = new Set(["cc_email_sends", "cc_generation_jobs"]);
const REST_PREFIX = `${supabaseUrl}/rest/v1/`;
const proxiedFetch: typeof fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith(REST_PREFIX)) return fetch(input, init);
  const rest = url.slice(REST_PREFIX.length); // "<bảng>?query" — query PostgREST giữ nguyên
  if (!CC_PROXIED_TABLES.has(rest.split("?")[0])) return fetch(input, init);
  const target = `/api/cc-db/rest/v1/${rest}`;
  return fetch(typeof input === "string" || input instanceof URL ? target : new Request(target, input), init);
};

export const supabase = createClient(supabaseUrl, supabaseKey, { global: { fetch: proxiedFetch } });
