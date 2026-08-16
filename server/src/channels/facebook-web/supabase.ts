// packages/server/src/channels/facebook-web/supabase.ts
//
// Re-export of the shared Supabase client used by all channels
// (defined once in zalo-personal/supabase.ts to share connection pooling).
// FB Web doesn't need a separate client — same Gemral DB target.

export { supabase, getSupabase } from '../zalo-personal/supabase.js';
