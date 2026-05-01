import { config } from 'dotenv';
config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || 'https://pgfkbcnzqozzkohwbgbk.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
supabase.from('channel_pending_messages').select('thread_id, sender_name').order('ts', {ascending: false}).limit(1).then(r => console.log(r.data));
