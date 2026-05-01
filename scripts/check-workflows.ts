import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('gem_sops')
    .select('sop_id, name, steps')
    .like('sop_id', 'CNT-NOTION%');
    
  if (error) {
    console.error('Error fetching sops:', error);
    return;
  }
  
  console.log(JSON.stringify(data, null, 2));
}

check();
