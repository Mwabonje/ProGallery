import { supabase } from './services/supabase';

async function check() {
  const { data, error } = await supabase.from('galleries').select('*').limit(1);
  console.log(data, error);
}

check();
