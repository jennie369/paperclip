import { config } from 'dotenv';
config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || 'https://pgfkbcnzqozzkohwbgbk.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
supabase.from('channel_instances').select('name').then(r => console.log(r.data));
