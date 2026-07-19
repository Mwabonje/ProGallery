import { supabase } from './services/supabase';

async function run() {
  const { data, error } = await supabase.from('blogs').select('status').limit(1);
  console.log("Status check:", data, error?.message);
}
run();
