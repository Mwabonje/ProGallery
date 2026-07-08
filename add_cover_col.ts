import { supabase } from './services/supabase';
async function run() {
   // Let's see if we can insert or update it? We can't do DDL directly using supabase JS usually.
   const { data, error } = await supabase.from('galleries').select('cover_url').limit(1);
   console.log(error);
}
run();
