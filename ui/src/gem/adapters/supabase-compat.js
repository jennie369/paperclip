// ============================================================================
// Supabase Client Adapter for Content Center
// Re-exports Gemral's supabase client so @gem/services can use it
// ============================================================================

import { supabase } from '../../lib/supabaseClient';

// Content Center's getSupabase() returns a singleton client
// We map it to Gemral's existing supabase client instance
export function getSupabase() {
  return supabase;
}

// Admin client not available in browser context
export function getSupabaseAdmin() {
  console.warn('[CC] getSupabaseAdmin() is not available in Gemral browser context. Use API routes instead.');
  return supabase;
}
