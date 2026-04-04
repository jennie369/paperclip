import { supabase } from './server/src/channels/zalo-personal/supabase.js';

async function main() {
  const { data, error } = await supabase.rpc('get_column_info', { p_table_name: 'paperclip_agents' }).select('*');
  console.log('rpc result:', data, error);

  const { data: qData, error: qError } = await supabase.from('paperclip_agents').select('provider').limit(1);
  console.log('query result:', qData, qError);

  // If this gives an error about "invalid input value for enum", we'll know!
  const { data: updateData, error: updateError } = await supabase
    .from('paperclip_agents')
    .update({ provider: 'ollama' })
    .eq('slug', 'does-not-exist')
    .select();
  console.log('update result:', updateError);
}
main();
