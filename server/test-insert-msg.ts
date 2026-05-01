import { config } from 'dotenv';
config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || 'https://pgfkbcnzqozzkohwbgbk.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function main() {
  const r = await supabase.from('channel_outbound_messages').select('*').limit(1);
  if (r.data && r.data.length > 0) {
    console.log(Object.keys(r.data[0]));
  }
}
main().catch(console.error);
