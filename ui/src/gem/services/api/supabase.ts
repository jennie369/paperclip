// ============================================================================
// Supabase Client — Content Center (Phase 1: unified to Main Supabase)
// CC data is now on Main Supabase (pgfkbcnzqozzkohwbgbk)
// ============================================================================

import { supabase } from '../../../lib/supabaseClient';

/**
 * Returns the Main Supabase client for Content Center operations.
 * CC tables (cc_scripts, cc_generation_jobs, etc.) are now on Main Supabase.
 */
export function getSupabase() {
  return supabase;
}

export function getSupabaseAdmin() {
  console.warn('[CC] getSupabaseAdmin() not available in browser. Use API proxy instead.');
  return supabase;
}

export async function ensureCCProfile() {
  // No-op: profiles are already synced via main Supabase auth
}
