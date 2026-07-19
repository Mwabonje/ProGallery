import { supabase } from './services/supabase';

async function run() {
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .overlaps('tags', ['wedding', 'test'])
    .limit(2);
  console.log("Overlap result:", data?.map(d => d.title), error?.message);
}
run();
