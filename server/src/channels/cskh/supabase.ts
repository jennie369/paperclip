// paperclip/server/src/channels/cskh/supabase.ts
// Re-export the shared channels service-role client (same Gemral DB target,
// pgfkbcnzqozzkohwbgbk). Defined once in zalo-personal/supabase.ts for pooling.
export { supabase, getSupabase } from '../zalo-personal/supabase.js';
