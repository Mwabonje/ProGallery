import { supabase } from './services/supabase';

async function run() {
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .limit(1);
    
  console.log("Existing blogs:", data, "error:", error);
}

run();
