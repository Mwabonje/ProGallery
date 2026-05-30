import { supabase } from './services/supabase';

async function check() {
  const { count, error } = await supabase.from('galleries').select('*', { count: 'exact', head: true });
  console.log('Total galleries:', count, error);
}
check();
