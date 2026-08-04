import { supabase } from './services/supabase.ts';

async function check() {
  const { data, error } = await supabase.from('selections').select('*').not('client_note', 'is', null);
  console.log('Notes:', data);
  console.log('Error:', error);
}
check();
